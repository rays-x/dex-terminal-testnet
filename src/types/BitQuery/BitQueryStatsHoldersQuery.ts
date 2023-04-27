export interface Holder {
  count: number;
}

export interface Stats {
  holders: Holder[];
}

export interface Data {
  stats: Stats;
}

export interface BitQueryStatsHoldersQuery {
  data: Data;
}
