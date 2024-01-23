'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
exports.ServerTransport = void 0
class ServerTransport {
  /**
   *
   */
  constructor(serverUrl, token, streamId) {
    this.serverUrl = serverUrl
    this.token = token
    this.streamId = streamId
  }
  async SaveObject(id, map) {
    const query = `mutation objectCreate ($object: ObjectCreateInput!) {objectCreate(objectInput: $object)}`
    await fetch(`${this.serverUrl}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        variables: {
          object: {
            streamId: this.streamId,
            objects: [Object.fromEntries(map)]
          }
        }
      })
    })
    // const data = (await response.json()) as any
  }
  async CreateCommit(branchName, objectId, message) {
    const query = `mutation commitCreate($myCommit: CommitCreateInput!){ commitCreate(commit: $myCommit)}`
    await fetch(`${this.serverUrl}/graphql`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + this.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: query,
        variables: {
          myCommit: {
            streamId: this.streamId,
            branchName: branchName,
            objectId: objectId,
            message: message ? message : 'Data from Excel',
            sourceApplication: 'excel'
          }
        }
      })
    })
    // const data = (await response.json()) as any
  }
}
exports.ServerTransport = ServerTransport
