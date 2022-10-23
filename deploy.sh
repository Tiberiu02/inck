git pull

cd packages/server
npm install

cd ../../

cd packages/client
npm run build
pm2 restart all
