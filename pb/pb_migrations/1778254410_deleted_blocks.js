/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4194232374");

  return app.delete(collection);
}, (app) => {
  const collection = new Collection({
    "createRule": "@request.auth.id != ''",
    "deleteRule": "@request.auth.id != ''",
    "fields": [
      {
        "autogeneratePattern": "[a-z0-9]{15}",
        "help": "",
        "hidden": false,
        "id": "text3208210256",
        "max": 15,
        "min": 15,
        "name": "id",
        "pattern": "^[a-z0-9]+$",
        "presentable": false,
        "primaryKey": true,
        "required": true,
        "system": true,
        "type": "text"
      },
      {
        "cascadeDelete": false,
        "collectionId": "pbc_1033569988",
        "help": "",
        "hidden": false,
        "id": "relation3718913242",
        "maxSelect": 1,
        "minSelect": 0,
        "name": "episode",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "relation"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select1253049682",
        "maxSelect": 1,
        "name": "block_type",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "intro",
          "title",
          "content",
          "lower_third",
          "transition",
          "outro",
          "caption"
        ]
      },
      {
        "help": "",
        "hidden": false,
        "id": "number4113142680",
        "max": 0,
        "min": 0,
        "name": "order",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text478250810",
        "max": 5000,
        "min": 0,
        "name": "script",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "autogeneratePattern": "",
        "help": "",
        "hidden": false,
        "id": "text4162930552",
        "max": 0,
        "min": 0,
        "name": "composition_src",
        "pattern": "",
        "presentable": false,
        "primaryKey": false,
        "required": false,
        "system": false,
        "type": "text"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number1345189255",
        "max": 0,
        "min": 0,
        "name": "start_time",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number2254405824",
        "max": 0,
        "min": 0,
        "name": "duration",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "number4035233190",
        "max": 0,
        "min": 0,
        "name": "track_index",
        "onlyInt": false,
        "presentable": false,
        "required": false,
        "system": false,
        "type": "number"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json2295037201",
        "maxSize": 0,
        "name": "variables",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "json2043772302",
        "maxSize": 0,
        "name": "assets",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "json"
      },
      {
        "help": "",
        "hidden": false,
        "id": "select2063623452",
        "maxSelect": 1,
        "name": "status",
        "presentable": false,
        "required": false,
        "system": false,
        "type": "select",
        "values": [
          "pending",
          "generated",
          "approved",
          "needs_revision"
        ]
      }
    ],
    "id": "pbc_4194232374",
    "indexes": [],
    "listRule": "@request.auth.id != ''",
    "name": "blocks",
    "system": false,
    "type": "base",
    "updateRule": "@request.auth.id != ''",
    "viewRule": "@request.auth.id != ''"
  });

  return app.save(collection);
})
