/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Add schedule_template relation to channels
  const channels = app.findCollectionByNameOrId('channels')
  if (channels) {
    if (!channels.fields.getByName('schedule_template')) {
      channels.fields.add(new RelationField({
        name: 'schedule_template',
        collectionId: (app.findCollectionByNameOrId('episode_templates') || {}).id || 'pbc_1234567890',
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1,
      }))
    }
    app.save(channels)
  }

  // Add template relation to episodes
  const episodes = app.findCollectionByNameOrId('episodes')
  if (episodes) {
    if (!episodes.fields.getByName('template')) {
      episodes.fields.add(new RelationField({
        name: 'template',
        collectionId: (app.findCollectionByNameOrId('episode_templates') || {}).id || 'pbc_1234567890',
        cascadeDelete: false,
        minSelect: 0,
        maxSelect: 1,
      }))
    }
    app.save(episodes)
  }
}, (app) => {
  const channels = app.findCollectionByNameOrId('channels')
  if (channels) {
    channels.fields.removeByName('schedule_template')
    app.save(channels)
  }
  const episodes = app.findCollectionByNameOrId('episodes')
  if (episodes) {
    episodes.fields.removeByName('template')
    app.save(episodes)
  }
})
