# Commands for Insteon PLM Node

## Info

Request
```json
{
	"topic": "info"
}
```

Response
```json
{
	"topic": "info",
	"payload": {
		"type": 0x60,
		"ID": [21,21,21],
		"devcat": 3,
		"subcat": 32,
		"firmware": 58,
		"ack": true
	}
}
```

## Config

Request
```json
{
	"topic": "config"
}
```

Response
```json
{
	"topic": "config",
	"payload": {
		"type": 0x73,
		"autoLinking": true,
		"monitorMode": true,
		"autoLED": true,
		"deadman": true,
		"ack": true
	}
}
```

## Links

```json
{
	"topic": "links"
}
```

Response
```json
{
	"topic": "links",
	"payload": [
		[
			{
				"recordType": 1,
				"allLinkGroup": 10,
				"from": [21, 21, 21],
				"linkData": [22, 22, 22],
				"index": 9
			}
			...2 more
		]

		...254 more
	]
}
```

## Sync Info

Request
```json
{
	"topic": "syncInfo"
}
```

Response
```json
{
	"topic": "syncInfo",
	"payload": {
		"type": 0x60,
		"ID": [21,21,21],
		"devcat": 3,
		"subcat": 32,
		"firmware": 58,
		"ack": true
	}
}
```

## Sync Config

Request
```json
{
	"topic": "syncConfig"
}
```

Response
```json
{
	"topic": "syncConfig",
	"payload": {
		"type": 0x73,
		"autoLinking": true,
		"monitorMode": true,
		"autoLED": true,
		"deadman": true,
		"ack": true
	}
}
```

## Sync Links

```json
{
	"topic": "syncLinks"
}
```

Response
```json
{
	"topic": "syncLinks",
	"payload": [
		[
			{
				"recordType": 1,
				"allLinkGroup": 10,
				"from": [21, 21, 21],
				"linkData": [22, 22, 22],
				"index": 9
			}
			...2 more
		]

		...254 more
	]
}
```

## Reset

## Sleep

```json
{
	"topic": "sleep"
}
```

Response
```json
{
  "topic": "sleep",
  "payload": {
    "type": 114,
    "cmd1": 6,
    "cmd2": 0,
    "ack": false
  }
}
```

## Wake

```json
{
	"topic": "sleep"
}
```

Response
```json
{
  "topic": "packet",
  "payload": {
    "type": 21
  }
}
```

## Close

## Command

## Extended Command

## Group Command

## Start Linking

## Stop Linking

## Set Config

## Set Category

## Set LED