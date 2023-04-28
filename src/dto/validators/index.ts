import { ClassConstructor, plainToInstance, Type } from 'class-transformer';
import { registerDecorator, validateSync } from 'class-validator';

export function OneOf(
  types: Exclude<Parameters<typeof Type>[0], undefined>[]
): PropertyDecorator {
  return (target: Object, propertyName: PropertyKey) => {
    registerDecorator({
      name: 'wrongType',
      target: target.constructor,
      propertyName: propertyName.toString(),
      options: {},
      validator: {
        validate(arg: object | Array<object>) {
          const objects = Array.isArray(arg) ? arg : [arg];

          return !objects.some((somethingToTransform) =>
            types.some((t) => {
              const classType = t() as ClassConstructor<object>;

              if (
                somethingToTransform == null ||
                !['string', 'object'].includes(typeof somethingToTransform)
              ) {
                throw new Error(
                  'Incorrect object param type! Only string or objects are allowed.'
                );
              }

              const instance = plainToInstance(
                classType,
                typeof somethingToTransform === 'string'
                  ? JSON.parse(somethingToTransform)
                  : somethingToTransform
              );

              try {
                const errors = validateSync(instance);

                return !!errors.length;
              } catch (error) {
                return true;
              }
            })
          );
        },
        defaultMessage() {
          if (types.length === 0) {
            return '';
          }

          if (types.length === 1) {
            const type = types[0]();
            return `Has to be of type ${type.name}.`;
          }

          const lastType = types.pop()!();
          return `Can only be of types ${types
            .map((t) => {
              const type = t();
              return type.name;
            })
            .join(', ')}, or ${lastType.name}.`;
        },
      },
    });
  };
}
