/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collections = [
    'channels',
    'episodes',
    'blocks',
    'scripts',
    'research_results',
    'personalities',
    'media_library',
    'episode_templates',
  ]

  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name)
    if (!collection) continue

    if (!collection.fields.getByName('created')) {
      collection.fields.add(new AutodateField({
        name: 'created',
        onCreate: true,
      }))
    }

    if (!collection.fields.getByName('updated')) {
      collection.fields.add(new AutodateField({
        name: 'updated',
        onCreate: true,
        onUpdate: true,
      }))
    }

    app.save(collection)
  }
}, (app) => {
  const collections = [
    'channels',
    'episodes',
    'blocks',
    'scripts',
    'research_results',
    'personalities',
    'media_library',
    'episode_templates',
  ]

  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name)
    if (!collection) continue

    collection.fields.removeByName('created')
    collection.fields.removeByName('updated')
    app.save(collection)
  }
})
