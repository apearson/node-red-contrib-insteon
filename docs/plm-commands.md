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
```json
{
	"topic": "close"
}
```

Response
```json
{
  "topic": "close"
}
```

## Command

```json
{
	"topic": "command",
	"device": [0x21,0x21,0x21],
	"payload": [0x2E, 0x00]
}
```

Response
```json
{
  "topic": "command",
  "payload": {
    "type": 98,
    "extended": false,
    "to": [ 21, 21, 21 ],
    "flags": 15,
    "cmd1": 46,
    "cmd2": 0,
    "ack": true
  },
  "device": [ 21, 21, 21 ]
}
```

## Extended Command
```json
{
	"topic": "extendedCommand",
	"device": [0x42,0x42,0x42],
	"payload": [0x13, 0x00],
	"data": [0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]

}
```

Response
```json 
{
  "topic": "extendedCommand",
  "payload": {
    "type": 98,
    "extended": true,
    "to": [0x42,0x42,0x42],
    "flags": 31,
    "cmd1": 17,
    "cmd2": 255,
    "ack": null,
    "userData": [0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]
  },
  "device": [0x42,0x42,0x42],
  "data": [0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]
}
```

## Group Command
```json
{
  "payload": [0x11, 0xFF],
  "group": 12,
  "topic": "groupCommand"
}
```

Response
```json 
{
  "topic": "packet",
  "payload": {
    "type": 97,
    "allLinkGroup": 12,
    "allLinkCommand": 19,
    "broadcastCommand2": 0,
    "ack": true
  },
}
```


## Start Linking

```json
{
	"topic": "startLinking",
	"type": 1,
	"payload": 1
}
```

Response
```json
{
  "topic": "startLinking",
  "payload": {
    "type": 100,
    "linkCode": 1,
    "allLinkGroup": 1,
    "ack": true
  },
  "type": 1
}
```

## Stop Linking

```json
{
	"topic": "stopLinking"
}
```

Response
```json
{
  "topic": "stopLinking",
  "payload": {
    "type": 101,
    "ack": true
  }
}
```

## Set Config

```json
{
	"topic": "setConfig",
	"payload": {
		"autoLinking": true,
		"monitorMode": true,
		"autoLED": false,
		"deadman": true
	}
}
```

Response
```json
{
  "topic": "setConfig",
  "payload": {
    "type": 107,
    "autoLinking": true,
    "monitorMode": true,
    "autoLED": false,
    "deadman": true,
    "ack": true
  }
}
```

## Set Category

```json
{
	"topic": "setCategory",
	"payload": [0x03, 0x20],
	"firmware": 0x3A
}
```

Response
```json
{
  "topic": "setCategory",
  "payload": {
    "type": 102,
    "devcat": 3,
    "subcat": 32,
    "firmware": 58,
    "ack": true
  },
  "firmware": 58
}
```

## Set LED

```json
{
	"topic": "setLed",
	"payload": false
}
```

Response
```json
{
  "topic": "setLed",
  "payload": {
    "type": 109,
    "ack": true
  }
}
```