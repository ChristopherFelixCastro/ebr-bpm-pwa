import { app } from './app.js';
import { env } from './config/env.js';
import { closeDatabasePool } from './db/client.js';

const server=app.listen(env.PORT,()=>console.log(`API listening on ${env.PORT}`));
let closing=false;
const shutdown=(signal:string)=>{if(closing)return;closing=true;server.close(async(error)=>{try{await closeDatabasePool()}finally{if(error){console.error(`${signal}: graceful shutdown failed`);process.exitCode=1}}});setTimeout(()=>{console.error(`${signal}: graceful shutdown timed out`);process.exit(1)},10000).unref()};
process.once('SIGTERM',()=>shutdown('SIGTERM'));
process.once('SIGINT',()=>shutdown('SIGINT'));
