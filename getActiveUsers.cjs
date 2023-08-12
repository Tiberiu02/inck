const fs = require('fs');

DATA_DIR = 'packages/user-data/analytics';

const userIds = {};

fs.readdirSync(DATA_DIR).forEach(file => {
  const [y, m, d] = file.replace('.log', '').split('-').map(x => parseInt(x))
  if (y < 2023 || m < 5)
    return;
  console.log(file);
  const data = fs.readFileSync(`${DATA_DIR}/${file}`, { encoding: 'utf8', flag: 'r' }).trim().split('\n');
  for (const row of data) {
    try {
      const userId = row.split('userId=')[1].split(' ')[0];
      userIds[userId] = true;
    } catch (e) { }
  }
  console.log(`Found ${Object.keys(userIds).length} unique users so far`);
});

console.log('Users found:', Object.keys(userIds).map(s => `ObjectId('${s}')`).join(','));