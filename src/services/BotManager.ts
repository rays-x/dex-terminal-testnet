import { Payload, Subscribe, Topic } from 'nest-mqtt';
import Docker from 'dockerode';
import { InjectAwsService } from 'nest-aws-sdk';
import AwsSDK from 'aws-sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { dump as json2Yaml, load as yaml2Json } from 'js-yaml';
import { get, merge } from 'lodash-es';
import { InjectModel } from 'nestjs-typegoose';
import Typegoose from '@typegoose/typegoose';
import { Types } from 'mongoose';
import { HttpException, HttpStatus } from '@nestjs/common';
import ExchangeEntity from '../entities/Bot/Exchange';
import UserEntity, { UserEntityDefaultSelect } from '../entities/Bot/User';
import StrategyEntity from '../entities/Bot/Strategy';
import { HttpStatusMessages } from '../messages/http';
import BotEntity, {
  BotEntityDefaultSelect,
  BotStatus,
} from '../entities/Bot/Bot';
import BotLogEntity, {
  BotLogEntityDefaultSelect,
  BotLogType,
} from '../entities/Bot/BotLog';

export class BotManagerService {
  docker = new Docker({
    socketPath: '/var/run/docker.sock',
  });

  constructor(
    @InjectAwsService(AwsSDK.S3) private readonly s3: AwsSDK.S3,
    @InjectModel(ExchangeEntity)
    private readonly repoExchange: Typegoose.ReturnModelType<
      typeof ExchangeEntity
    >,
    @InjectModel(StrategyEntity)
    private readonly repoStrategy: Typegoose.ReturnModelType<
      typeof StrategyEntity
    >,
    @InjectModel(UserEntity)
    private readonly repoUser: Typegoose.ReturnModelType<typeof UserEntity>,
    @InjectModel(BotEntity)
    private readonly repoBot: Typegoose.ReturnModelType<typeof BotEntity>,
    @InjectModel(BotLogEntity)
    private readonly repoBotLog: Typegoose.ReturnModelType<typeof BotLogEntity>
  ) {}

  async userExchangeUpsert(address: string, { id, params }) {
    const lcAddress = address.toLowerCase();

    const { exchanges } = await this.repoUser
      .findOneAndUpdate(
        {
          address: lcAddress,
        },
        {},
        {
          upsert: true,
          new: true,
        }
      )
      .select(UserEntityDefaultSelect);

    const edited = exchanges.reduce(
      (prev, exchange) => [
        ...prev,
        exchange?.exchange.toString() !== id
          ? exchange
          : {
              exchange: id,
              params,
            },
      ],
      []
    );

    if (
      !edited.find(({ exchange }) => (exchange?.toString() || exchange) === id)
    ) {
      edited.push({
        exchange: id,
        params,
      });
    }

    const { exchanges: updatedExchanges } = await this.repoUser
      .findOneAndUpdate(
        {
          address: lcAddress,
        },
        {
          exchanges: edited,
        },
        { new: true }
      )
      .select(UserEntityDefaultSelect);

    return updatedExchanges.find(
      ({ exchange }) => (exchange?.toString() || exchange) === id
    );
  }

  async userExchangesList(address: string, id?: string) {
    const lcAddress = address.toLowerCase();

    const user = await Promise.all(
      (
        await this.repoUser.aggregate([
          {
            $match: { address: lcAddress },
          },
          { $limit: 1 },
          {
            $project: {
              exchanges: {
                $filter: {
                  input: '$exchanges',
                  as: 'exchange',
                  cond: id
                    ? {
                        $and: [
                          {
                            $eq: [
                              '$$exchange.exchange',
                              new Types.ObjectId(id),
                            ],
                          },
                          {
                            $gt: ['$$exchange.params', null],
                          },
                        ],
                      }
                    : {
                        $gt: ['$$exchange.params', null],
                      },
                },
              },
            },
          },
          {
            $unwind: '$exchanges',
          },
          {
            $project: {
              exchanges: true,
              params: {
                $objectToArray: '$exchanges.params',
              },
            },
          },
          {
            $match: {
              params: {
                $elemMatch: {
                  v: {
                    $exists: true,
                    $gt: '',
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: '$_id',
              exchanges: {
                $addToSet: '$exchanges',
              },
            },
          },
        ])
      ).map(async (__) =>
        this.repoUser.hydrate(__).populate('exchanges.exchange')
      )
    );

    return id ? get(user, '0.exchanges.0', null) : get(user, '0.exchanges', []);
  }

  async exchangesList() {
    return this.repoExchange.find();
  }

  async strategyFindMany() {
    return this.repoStrategy.find();
  }

  async strategyFindOne(_id: string) {
    return this.repoStrategy.findOne({ _id });
  }

  async botCreate(_address, { id: strategyId, params: strategyParams }) {
    const address = _address.toLowerCase();

    const [userId, strategySlug, connectors] = await Promise.all([
      this.repoUser.findOne({ address }),
      this.repoStrategy.findById(strategyId).select('slug'),
      this.userExchangesList(_address),
    ]).then(([_user, strategy, _connectors]) => [
      _user?.id,
      strategy?.slug,
      _connectors,
    ]);

    if (!userId || !strategySlug) {
      throw new HttpException(
        HttpStatusMessages.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    const { id } = await this.repoBot.create({
      user: userId,
      status: BotStatus.stopped,
      strategy: {
        id: strategyId,
        params: strategyParams,
      },
    });

    const BucketConf = `hb.bot-${id}.conf`;
    const BucketLogs = `hb.bot-${id}.logs`;

    const templatesPath = join(`${__dirname}/../view/templates/bot`);

    const confClient = json2Yaml(
      merge(
        yaml2Json(readFileSync(`${templatesPath}/conf_client.yml`, 'utf-8')),
        {
          instance_id: id,
          mqtt_bridge: {
            mqtt_host: process.env.MQTT_HOST,
          },
          db_mode: {
            db_host: process.env.POSTGRES_HOST,
          },
        }
      )
    );

    const confStrategy = json2Yaml(
      merge(
        yaml2Json(
          readFileSync(
            `${templatesPath}/strategies/${strategySlug}.yml`,
            'utf-8'
          )
        ),
        strategyParams
      )
    );

    await Promise.all([
      this.s3.createBucket({ Bucket: BucketConf }).promise(),
      this.s3.createBucket({ Bucket: BucketLogs }).promise(),
    ]);

    await Promise.all([
      this.s3
        .putObject({
          Bucket: BucketConf,
          Key: 'data/.password_verification',
          Body: 'HummingBot',
        })
        .promise(),
      this.s3
        .putObject({
          Bucket: BucketConf,
          Key: 'data/conf_fee_overrides.yml',
          Body: readFileSync(
            `${templatesPath}/conf_fee_overrides.yml`,
            'utf-8'
          ),
        })
        .promise(),
      this.s3
        .putObject({
          Bucket: BucketConf,
          Key: 'data/hummingbot_logs.yml',
          Body: readFileSync(`${templatesPath}/hummingbot_logs.yml`, 'utf-8'),
        })
        .promise(),
      this.s3
        .putObject({
          Bucket: BucketConf,
          Key: 'data/conf_client.yml',
          Body: confClient,
        })
        .promise(),
      Promise.all(
        connectors.map(({ exchange: { slug }, params }) =>
          this.s3
            .putObject({
              Bucket: BucketConf,
              Key: `data/connectors/${slug}.yml`,
              Body: json2Yaml(
                merge(
                  yaml2Json(
                    readFileSync(
                      `${templatesPath}/connectors/${slug}.yml`,
                      'utf-8'
                    )
                  ),
                  params
                )
              ),
            })
            .promise()
        )
      ),
      this.s3
        .putObject({
          Bucket: BucketConf,
          Key: `data/strategies/${strategySlug}.yml`,
          Body: confStrategy,
        })
        .promise(),
    ]);

    const container = await this.docker.createContainer({
      name: `hb_bot_${id}`,
      Image: 'bardakdev/hb_pg',
      Env: [
        `CONFIG_FILE_NAME=${strategySlug}.yml`,
        'CONFIG_PASSWORD=HummingBot',
      ],
      HostConfig: {
        Mounts: [
          {
            Type: 'volume',
            VolumeOptions: {
              NoCopy: true,
              Labels: {},
              DriverConfig: {
                Name: 's3fs',
                Options: {},
              },
            },
            Source: BucketConf,
            Target: '/conf',
            ReadOnly: false,
          },
          {
            Type: 'volume',
            VolumeOptions: {
              NoCopy: true,
              Labels: {},
              DriverConfig: {
                Name: 's3fs',
                Options: {},
              },
            },
            Source: BucketLogs,
            Target: '/logs',
            ReadOnly: false,
          },
        ],
        NetworkMode: 'ray',
      },
      Tty: true,
      OpenStdin: true,
    });

    await this.repoBot.findByIdAndUpdate(id, {
      container: container.id,
      status: container ? BotStatus.running : BotStatus.error,
    });

    await container?.start();

    return this.botList(_address, id);
  }

  async botDelete(id: string) {
    const bot = await this.repoBot
      .findById(id)
      .select([...BotEntityDefaultSelect, 'container']);

    if (!bot) {
      throw new HttpException(
        HttpStatusMessages.INTERNAL_SERVER_ERROR,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    try {
      const container = await this.docker.getContainer(bot.container);
      await container?.remove({
        force: true,
      });
    } catch (e) {
      /* ignore */
    }

    await Promise.allSettled([
      this.repoBotLog.deleteMany({
        bot: id,
      }),
      this.repoBot.findByIdAndDelete(id),
    ]);

    return true;
  }

  async botList(address: string, id?: string) {
    const lcAddress = address.toLowerCase();

    const user = await this.repoUser.findOne({ address: lcAddress });
    if (!user) {
      return [];
    }

    const result = (
      await this.repoBot
        .find(
          id
            ? {
                _id: id,
                user: user.id,
              }
            : {
                user: user.id,
              }
        )
        .select(BotEntityDefaultSelect)
        .populate({
          path: 'strategy.id',
          select: ['id', 'slug', 'name'],
        })
    ).map((_doc) => {
      const {
        strategy: {
          id: { id: sid, slug, name },
          params,
        },
        ...rest
      }: any = _doc.toJSON();

      return {
        strategy: {
          id: sid,
          slug,
          name,
          params,
        },
        ...rest,
      };
    });

    return id ? get(result, 0) : result;
  }

  async botLogs(bot) {
    return this.repoBotLog
      .find({ bot })
      .sort('createdAt')
      .select(BotLogEntityDefaultSelect);
  }

  @Subscribe(`${process.env.MQTT_BOTS_NAMESPACE}/+/log`)
  async mqttSubscriptionEvent_log(@Payload() payload, @Topic() topic: string) {
    const [, id] = topic.split('/');
    await this.repoBotLog.create({
      bot: id,
      type: BotLogType.log,
      message: get(payload, 'msg', '').replace(/hummingbot/gi, 'Bot'),
    });
  }

  @Subscribe(`${process.env.MQTT_BOTS_NAMESPACE}/+/events`)
  async mqttSubscriptionEvent_events(
    @Payload() payload,
    @Topic() topic: string
  ) {
    const [, id] = topic.split('/');

    await this.repoBotLog.create({
      bot: id,
      type: BotLogType.event,
      message: get(payload, 'msg', '').replace(/hummingbot/gi, 'Bot'),
    });
  }

  @Subscribe(`${process.env.MQTT_BOTS_NAMESPACE}/+/notify`)
  async mqttSubscriptionEvent_notify(
    @Payload() payload,
    @Topic() topic: string
  ) {
    const [, id] = topic.split('/');

    await this.repoBotLog.create({
      bot: id,
      type: BotLogType.notify,
      message: get(payload, 'msg', '').replace(/hummingbot/gi, 'Bot'),
    });
  }
}
