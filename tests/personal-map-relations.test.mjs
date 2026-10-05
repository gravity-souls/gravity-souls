import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
const { personalNodeRelations, personalNodeOffset } = require('../lib/personal-map-relations.ts')
const { constellationGroup, parseConstellationGroup, constellationGroups } = require('../lib/activity-constellations.ts')
const { personalMapOrigin, explorationOrigin, explorationReturnHref } = require('../lib/exploration-return.ts')
const { PersonalRelationLegend, PersonalNodeRelations } = require('../components/star-map/PersonalMapRelations.tsx')
const { NextIntlClientProvider } = require('next-intl')
const node = { id:'target',name:'Target',href:'/planet/target',groupId:'calm' }

test('saved, outgoing and mutual edges coexist without treating chat or incoming follow as a new edge', () => {
  assert.deepEqual(personalNodeRelations(node),[])
  assert.deepEqual(personalNodeRelations({...node,relationship:{saved:false,following:false,followedBy:true,conversationId:'thread'}}),[])
  assert.deepEqual(personalNodeRelations({...node,relationship:{saved:true,following:true,followedBy:false,conversationId:'thread'}}),['saved','following'])
  assert.deepEqual(personalNodeRelations({...node,relationship:{saved:true,following:true,followedBy:true,conversationId:null}}),['saved','mutual'])
})
test('galaxy edges require explicit independent creator/membership evidence, not a group label', () => {
  assert.deepEqual(personalNodeRelations({...node,kind:'galaxy',groupId:'joined'}),[])
  assert.deepEqual(personalNodeRelations({...node,kind:'galaxy',galaxyRelationship:{created:true,joined:false}}),['created'])
  assert.deepEqual(personalNodeRelations({...node,kind:'galaxy',galaxyRelationship:{created:true,joined:true}}),['created','joined'])
})
test('interest and pending/approved attendance stay independent; rejection and history never imply attendance', () => {
  const activity={...node,kind:'activity',groupId:'requested',userInterested:true}
  assert.deepEqual(personalNodeRelations({...activity,userAttendance:'PENDING'}),['interested','requested'])
  assert.deepEqual(personalNodeRelations({...activity,userAttendance:'APPROVED'}),['interested','going'])
  assert.deepEqual(personalNodeRelations({...activity,userAttendance:'REJECTED'}),['interested'])
  assert.deepEqual(personalNodeRelations({...activity,userInterested:false,userAttendance:'REJECTED'}),[])
  for (const status of ['APPROVED','PENDING','CANCELLED']) assert.deepEqual(personalNodeRelations({...activity,groupId:'past',userAttendance:status}),['past'])
  assert.deepEqual(personalNodeRelations({...activity,groupId:'history:galaxy',activityState:'past',userAttendance:'APPROVED'}),['past'])
})
test('bounded node layout is finite, deterministic and distinguishes nodes in a group', () => {
  for (const count of [1,24,36]) {
    const points=Array.from({length:count},(_,i)=>personalNodeOffset(i,count))
    assert.equal(new Set(points.map(p=>JSON.stringify(p))).size,count)
    points.forEach((p,i)=>{assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.deepEqual(p,personalNodeOffset(i,count))})
  }
})
test('activity groups use stable galaxy identity and batch units, with strict selectors',()=>{
  assert.equal(constellationGroup('real-galaxy',false),'active:real-galaxy')
  assert.deepEqual(parseConstellationGroup('history:real-galaxy'),{galaxyId:'real-galaxy',past:true})
  for(const input of ['past','active:','active:a/b','history:'+ 'x'.repeat(81),'https://example.test']) assert.equal(parseConstellationGroup(input),null)
  const groups=constellationGroups([
    {...node,groupId:'active:one',tagline:'Same name',activityState:'going'},
    {...node,id:'second',groupId:'active:one',tagline:'Same name',activityState:'requested'},
    {...node,id:'third',groupId:'active:two',tagline:'Same name',activityState:'interested'},
    {...node,id:'fourth',groupId:'history:one',tagline:'Same name',activityState:'past'},
  ])
  assert.equal(groups.length,3);assert.equal(groups.find(g=>g.id==='active:one').count,2)
  assert.equal(groups.find(g=>g.id==='history:one').phase,'past')
})
test('activity star group return links preserve map/list and reject arbitrary origins',()=>{
  for(const list of [false,true]) {
    const origin=personalMapOrigin('all',list,'constellations')
    assert.equal(explorationOrigin(origin),origin)
    assert.equal(explorationReturnHref(origin),'/star-map?mode=personal&layer=constellations'+(list?'&view=list':''))
  }
  assert.equal(explorationOrigin('personal-star-map-constellations-other'),null)
})
for (const locale of ['en','fr','zh']) test(`all layers have accessible relation legends and multi-relation labels in ${locale}`, () => {
  const messages=require(`../messages/${locale}.json`)
  const render=child=>renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale,messages,timeZone:'Europe/Paris'},child))
  const escaped=text=>renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)
  for(const layer of ['planets','galaxies','activities','constellations']) {
    const html=render(React.createElement(PersonalRelationLegend,{layer}))
    assert.ok(html.includes(`aria-label="${escaped(messages.starMap.relationLegend)}"`))
    assert.ok(html.includes(escaped(messages.starMap.relationScope)))
  }
  const html=render(React.createElement(PersonalNodeRelations,{node:{...node,relationship:{saved:true,following:true,followedBy:true,conversationId:null}}}))
  assert.ok(html.includes(escaped(messages.starMap.relation_saved)))
  assert.ok(html.includes(escaped(messages.starMap.relation_mutual)))
  assert.ok(!html.includes(escaped(messages.starMap.relation_following)))
})
