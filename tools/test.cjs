const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const tests=fs.readdirSync(path.join(root,'tests')).filter(name=>name.endsWith('.test.cjs')).sort();
for(const test of tests){const result=spawnSync(process.execPath,[path.join(root,'tests',test)],{cwd:root,stdio:'inherit',env:process.env});if(result.status!==0)process.exit(result.status||1);}
console.log(`${tests.length} suites passed`);
