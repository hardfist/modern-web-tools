import { CoreCommandLine } from './core';

const command = new CoreCommandLine();
command.execute().catch((err) => {
  console.error(err);
  process.exit(1);
});
