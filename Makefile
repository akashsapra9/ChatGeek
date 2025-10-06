back:
	rm -rf node_modules && npm install && npm start
front:
	cd frontend && rm -rf node_modules && npm install --legacy-peer-deps && npm start
front2:
	cd frontend && npm start
front3:
	cd frontend && npm start
clean:
	rm -rf node_modules && rm -rf frontend/node_modules
swap:
	cp .env .env.tmp && cp myEnv.txt .env && cp .env.tmp myEnv.txt && rm .env.tmp
# Check PORTS
lsof -i :5000
lsof -i :5001