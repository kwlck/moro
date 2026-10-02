'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const output=path.join(root,'dist','Moro-win32-x64');
if(!fs.existsSync(path.join(output,'Moro.exe')))throw new Error('Packaged Moro application not found');
// Electron already has a runtime LICENSE file; preserve it under its original name.
fs.copyFileSync(path.join(root,'LICENSE'),path.join(output,'MORO-LICENSE.txt'));
fs.copyFileSync(path.join(root,'NOTICE'),path.join(output,'MORO-NOTICE.txt'));
fs.copyFileSync(path.join(root,'THIRD_PARTY_NOTICES.md'),path.join(output,'THIRD_PARTY_NOTICES.md'));
