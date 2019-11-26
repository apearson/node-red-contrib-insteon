#rsync --delete -vr ./dist/* pi@10.0.1.55:./node-red-contrib-insteon-dist;
cp ./src/insteonDeviceConfig/insteonDeviceConfig.html ./dist/insteonDeviceConfig/insteonDeviceConfig.html;
# cp ./src/insteonDeviceConfig/insteonDeviceTypes.json ./dist/insteonDeviceConfig/insteonDeviceTypes.json;
cp ./src/insteonSubscribe/insteonSubscribe.html ./dist/insteonSubscribe/insteonSubscribe.html;
cp ./src/insteonPLM/insteonPLM.html ./dist/insteonPLM/insteonPLM.html;
cp ./src/PLMConfig/PLMConfig.html ./dist/PLMConfig/PLMConfig.html;

# rsync -rv --checksum --exclude '.DS_Store' --exclude '*.map' --delete ./dist/ pi@10.0.1.55:./node-red-contrib-insteon-dist;
# rsync -rv --checksum ./package.json pi@10.0.1.55:./package.json;
# ssh pi@10.0.1.55 'sudo cp -R /home/pi/node-red-contrib-insteon-dist/* /root/docker-volumes/nodered/_data/node_modules/node-red-contrib-insteon/dist';
# ssh pi@10.0.1.55 'sudo cp -R /home/pi/package.json /root/docker-volumes/nodered/_data/node_modules/node-red-contrib-insteon/package.json';
# ssh pi@10.0.1.55 'docker restart 489d3d0cfe73';

## ssh pi@10.0.1.55 'docker exec --user root b2f31cb5785b chmod 666 /dev/ttyPLM';

##use this to setup the port forward
##ssh 25ssrd.mooo.com -L 2201:10.0.1.55:22

rsync -rv --checksum -e 'ssh -p 2201' --exclude '.DS_Store' --exclude '*.map' --delete ./dist/ pi@localhost:./node-red-contrib-insteon-dist;
rsync -rv --checksum -e 'ssh -p 2201' ./package.json pi@localhost:./package.json;
rsync -rv --checksum -e 'ssh -p 2201' ./tests/ pi@localhost:./node-red-contrib-insteon-tests;
ssh pi@localhost -p 2201 'sudo cp -R /home/pi/node-red-contrib-insteon-dist/* /root/docker-volumes/nodered/_data/node_modules/node-red-contrib-insteon/dist;\
	                      sudo cp -R /home/pi/node-red-contrib-insteon-tests  /root/docker-volumes/nodered/_data/';


ssh pi@localhost -p 2201 'sudo cp -R /home/pi/package.json /root/docker-volumes/nodered/_data/node_modules/node-red-contrib-insteon/package.json';
ssh pi@localhost -p 2201 'docker restart 489d3d0cfe73';


# Local restart node-red
# killall node-red;
