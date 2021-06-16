#!/usr/bin/env node

import fs from 'fs';

const targetPath = process.env.targetPath;

fs.appendFileSync(targetPath, '3');
