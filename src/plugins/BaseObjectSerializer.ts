import { MD5, enc } from 'crypto-js'

/**
 * Serializer for Speckle objects written in Typescript
 */
export class BaseObjectSerializer {
  constructor(public transports: ITransport[]) {}

  public async SerializeBase(object: any): Promise<SerializedBase> {
    const converted = await this.PreserializeBase(object)
    let json = this.SerializeMap(converted)
    const id = this.GetId(json)
    converted.set('id', id)

    json = this.SerializeMap(converted)

    await this.StoreObject(id, converted)
    return new SerializedBase(id, json)
  }

  private async PreserializeObject(object: any): Promise<any> {
    if (!(object instanceof Object) || object instanceof String) {
      return object
    }

    if (object instanceof ObjectReference) {
      const converted = new Map<string, any>()
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
        const data = new Array<DataChunk>()
        while (serializedCount < object.length) {
          const dataChunkCount = Math.min(chunkSize, object.length - serializedCount)
          data.push(new DataChunk(object.slice(serializedCount, serializedCount + dataChunkCount)))
          serializedCount += dataChunkCount
        }
        return await this.PreserializeObject(data)
      }

      const convertedList = new Array<any>()
      for (const element of object) {
        convertedList.push(await this.PreserializeObject(element))
      }
      return convertedList
    }

    if (object instanceof Map) {
      const converted: Map<any, any> = new Map()
      for (const [key, value] of object) {
        converted.set(key, await this.PreserializeObject(value))
      }
      return converted
    }

    throw new Error('Unsupported conversion type')
  }

  public async PreserializeBase(o: any): Promise<Map<string, any>> {
    const converted = new Map<string, any>()

    for (const key of Object.keys(o)) {
      converted.set(key, await this.PreserializeObject(o[key]))
    }

    return converted
  }

  private async StoreObject(objectId: string, objectJson: Map<string, any>) {
    for (const transport of this.transports) {
      await transport.SaveObject(objectId, objectJson)
    }
  }

  private SerializeMap(Map: Map<string, any>): string {
    return JSON.stringify(Object.fromEntries(Map))
  }

  private GetId(json: string): string {
    return MD5(json).toString(enc.Hex)
  }
}

export class DataChunk implements IBase {
  public speckle_type: string = 'Speckle.Core.Models.DataChunk'
  public data: any[]
  constructor(data: any[] | null) {
    this.data = data ?? []
  }
}

export class ObjectReference implements IBase {
  public speckle_type: string = 'reference'

  constructor(public referencedId: string) {}
}

export interface IBase {
  speckle_type: string
}

export interface ITransport {
  SaveObject(id: string, object: Map<string, any>): Promise<void>
}

export class SerializedBase {
  constructor(public id: string, public json: string) {}
}
