'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.SerializedBase = exports.ObjectReference = exports.DataChunk = exports.BaseObjectSerializer = void 0
/* eslint-disable @typescript-eslint/ban-types */
const crypto_js_1 = require('crypto-js')
/**
 * Serializer for Speckle objects written in Typescript
 */
class BaseObjectSerializer {
  constructor(transports) {
    this.transports = transports
  }
  async SerializeBase(object) {
    return await this.SerializeBaseWithClosures(object, [])
  }
  async SerializeBaseWithClosures(object, closures) {
    const thisClosure = new Map()
    closures.push(thisClosure)
    const converted = await this.PreserializeEachObjectProperty(object, closures)
    let json = this.SerializeMap(converted)
    const id = this.GetId(json)
    converted.set('id', id)
    this.AddSelfToParentClosures(id, closures)
    if (thisClosure.size > 0) {
      converted.set('__closure', Object.fromEntries(thisClosure))
    }
    converted.set('totalChildrenCount', thisClosure.size)
    json = this.SerializeMap(converted)
    await this.StoreObject(id, converted)
    return new SerializedBase(id, json)
  }
  async PreserializeObject(object, closures) {
    if (!(object instanceof Object) || object instanceof String) {
      return object
    }
    if (object instanceof DataChunk) {
      const serialized = await this.SerializeBaseWithClosures(object, [...closures])
      return new ObjectReference(serialized.id)
    }
    if (object instanceof Array) {
      // chunk array into 5000 by default
      const chunkSize = 5000
      if (object.length > chunkSize) {
        let serializedCount = 0
        const data = new Array()
        while (serializedCount < object.length) {
          const dataChunkCount = Math.min(chunkSize, object.length - serializedCount)
          data.push(new DataChunk(object.slice(serializedCount, serializedCount + dataChunkCount)))
          serializedCount += dataChunkCount
        }
        return await this.PreserializeObject(data, closures)
      }
      const convertedList = new Array()
      for (const element of object) {
        convertedList.push(await this.PreserializeObject(element, closures))
      }
      return convertedList
    }
    if (object instanceof Object) {
      return Object.fromEntries(await this.PreserializeEachObjectProperty(object, closures))
    }
    throw new Error(`Cannot serialize object ${object}`)
  }
  async PreserializeEachObjectProperty(o, closures) {
    const converted = new Map()
    const getters = Object.entries(Object.getOwnPropertyDescriptors(Reflect.getPrototypeOf(o)))
      .filter(([key, descriptor]) => typeof descriptor.get === 'function' && key !== '__proto__')
      .map(([key]) => key)
    const objectKeys = new Array()
    objectKeys.push(...Object.keys(o))
    objectKeys.push(...getters)
    for (const key of objectKeys) {
      const objKey = key
      converted.set(
        BaseObjectSerializer.CleanKey(key),
        await this.PreserializeObject(o[objKey], closures)
      )
    }
    return converted
  }
  static CleanKey(originalKey) {
    const newStringChars = []
    for (let i = 0; i < originalKey.length; i++) {
      if (i == 1 && originalKey[i] == '@' && originalKey[0] == '@') {
        continue
      }
      if (this.disallowedCharacters.includes(originalKey[i])) {
        continue
      }
      newStringChars.push(originalKey[i])
    }
    return newStringChars.join('')
  }
  async StoreObject(objectId, object) {
    for (const transport of this.transports) {
      await transport.SaveObject(objectId, object)
    }
  }
  SerializeMap(map) {
    return JSON.stringify(Object.fromEntries(map))
  }
  GetId(json) {
    return (0, crypto_js_1.MD5)(json).toString(crypto_js_1.enc.Hex)
  }
  AddSelfToParentClosures(objectId, closureTables) {
    // only go to closureTable length - 1 because the last closure table belongs to the object with the
    // provided id
    const parentClosureTablesCount = closureTables.length - 1
    for (let parentLevel = 0; parentLevel < parentClosureTablesCount; parentLevel++) {
      const childDepth = parentClosureTablesCount - parentLevel
      closureTables[parentLevel].set(objectId, childDepth)
    }
  }
}
exports.BaseObjectSerializer = BaseObjectSerializer
BaseObjectSerializer.disallowedCharacters = ['.', '/']
class DataChunk {
  constructor(data) {
    this.speckle_type = 'Speckle.Core.Models.DataChunk'
    this.data = data ?? []
  }
}
exports.DataChunk = DataChunk
class ObjectReference {
  constructor(referencedId) {
    this.referencedId = referencedId
    this.speckle_type = 'reference'
  }
}
exports.ObjectReference = ObjectReference
class SerializedBase {
  constructor(id, json) {
    this.id = id
    this.json = json
  }
}
exports.SerializedBase = SerializedBase
