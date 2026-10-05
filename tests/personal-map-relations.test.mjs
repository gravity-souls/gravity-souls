import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const require = createRequire(import.meta.url)
const { personalNodeRelations, personalNodeOffset } = require('../lib/personal-map-relations.ts')
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
})
test('bounded node layout is finite, deterministic and distinguishes nodes in a group', () => {
  for (const count of [1,24,36]) {
    const points=Array.from({length:count},(_,i)=>personalNodeOffset(i,count))
    assert.equal(new Set(points.map(p=>JSON.stringify(p))).size,count)
    points.forEach((p,i)=>{assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));assert.deepEqual(p,personalNodeOffset(i,count))})
  }
})
for (const locale of ['en','fr','zh']) test(`all layers have accessible relation legends and multi-relation labels in ${locale}`, () => {
  const messages=require(`../messages/${locale}.json`)
  const render=child=>renderToStaticMarkup(React.createElement(NextIntlClientProvider,{locale,messages,timeZone:'Europe/Paris'},child))
  const escaped=text=>renderToStaticMarkup(React.createElement('span',null,text)).slice(6,-7)
  for(const layer of ['planets','galaxies','activities']) {
    const html=render(React.createElement(PersonalRelationLegend,{layer}))
    assert.ok(html.includes(`aria-label="${escaped(messages.starMap.relationLegend)}"`))
    assert.ok(html.includes(escaped(messages.starMap.relationScope)))
  }
  const html=render(React.createElement(PersonalNodeRelations,{node:{...node,relationship:{saved:true,following:true,followedBy:true,conversationId:null}}}))
  assert.ok(html.includes(escaped(messages.starMap.relation_saved)))
  assert.ok(html.includes(escaped(messages.starMap.relation_mutual)))
  assert.ok(!html.includes(escaped(messages.starMap.relation_following)))
})
