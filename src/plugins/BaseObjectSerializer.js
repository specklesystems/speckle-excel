'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.SerializedBase = exports.ObjectReference = exports.DataChunk = exports.BaseObjectSerializer = void 0
const crypto_js_1 = require('crypto-js')
/**
 * Serializer for Speckle objects written in Typescript
 */
class BaseObjectSerializer {
  constructor(transports) {
    this.transports = transports
  }
  async SerializeBase(object) {
    const converted = await this.PreserializeBase(object)
    let json = this.SerializeMap(converted)
    const id = this.GetId(json)
    converted.set('id', id)
    json = this.SerializeMap(converted)
    await this.StoreObject(id, converted)
    return new SerializedBase(id, json)
  }
  async PreserializeObject(object) {
    if (!(object instanceof Object) || object instanceof String) {
      return object
    }
    if (object instanceof ObjectReference) {
      const converted = new Map()
      converted.set('referencedId', object.referencedId)
      converted.set('speckle_type', object.speckle_type)
      return converted
    }
    if (object instanceof DataChunk) {
      const serialized = await this.SerializeBase(object)
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
        return await this.PreserializeObject(data)
      }
      const convertedList = new Array()
      for (const element of object) {
        convertedList.push(await this.PreserializeObject(element))
      }
      return convertedList
    }
    if (object instanceof Map) {
      const converted = new Map()
      for (const [key, value] of object) {
        converted.set(key, await this.PreserializeObject(value))
      }
      return converted
    }
    throw new Error('Unsupported conversion type')
  }
  async PreserializeBase(o) {
    const converted = new Map()
    for (const key of Object.keys(o)) {
      converted.set(key, await this.PreserializeObject(o[key]))
    }
    return converted
  }
  async StoreObject(objectId, objectJson) {
    for (const transport of this.transports) {
      await transport.SaveObject(objectId, objectJson)
    }
  }
  SerializeMap(Map) {
    return JSON.stringify(Object.fromEntries(Map))
  }
  GetId(json) {
    return (0, crypto_js_1.MD5)(json).toString(crypto_js_1.enc.Hex)
  }
}
exports.BaseObjectSerializer = BaseObjectSerializer
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
