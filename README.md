# Cryptocurrency tg bot
![Node.js Version][node-version-image]

Add a message with the constantly changing exchange rate of cryptocurrencies.

Copy and configure env:
```bash
cp .env.example .env
```
Start application:
```bash
docker compose up -d
```

### How to use

Send your chatbot a message like: \
`/add chatId ticker1 ticker2` \
Send `/send_prices` and enjoy the result


[node-version-image]: https://img.shields.io/badge/dynamic/xml?color=success&label=node&query=%27%20%3E%3D%20%27&suffix=v20.0.0&url=https%3A%2F%2Fnodejs.org%2F