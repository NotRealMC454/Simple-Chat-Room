export type database = {
  users: {
    [key: string]: {
      password: string;
      servers: string[];
    };
  };
  servers: {
    [key: string]: {
      name: string;
      owner: string;
      channels: string[];
      pfp: string;
    };
  };
};
