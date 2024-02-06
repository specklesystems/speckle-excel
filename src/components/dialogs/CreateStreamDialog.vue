<template>
  <v-container fluid class="px-1 pb-0 pt-1">
    <v-row class="px-3 py-0">
      <v-col class="d-flex justify-center pb-0">
        <!-- DIALOG: Create New Stream -->
        <v-dialog v-model="showCreateNewStream">
          <template #activator="{ on, attrs }">
            <v-btn block class="pa-3" small v-bind="attrs" v-on="on">
              <v-icon dark left>mdi-plus-circle</v-icon>
              {{ `Create New ${$store.state.isFE2 ? 'Project' : 'Stream'}` }}
            </v-btn>
          </template>

          <v-card>
            <v-card-title class="text-h5">
              {{ `Create New ${$store.state.isFE2 ? 'Project' : 'Stream'}` }}
            </v-card-title>
            <v-container class="px-6" pb-0>
              <v-text-field
                v-model="streamName"
                xxxclass="small-text-field"
                hide-details
                dense
                flat
                :placeholder="`${$store.state.isFE2 ? 'Project' : 'Stream'} Name (Optional)`"
              />
              <v-text-field
                v-model="description"
                xxxclass="small-text-field"
                hide-details
                dense
                flat
                placeholder="Description (Optional)"
              />
              <v-switch
                v-model="privateStream"
                :label="`Private ${$store.state.isFE2 ? 'Project' : 'Stream'}`"
              ></v-switch>
            </v-container>

            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue darken-1" text @click="showCreateNewStream = false">Cancel</v-btn>
              <v-btn color="blue darken-1" text @click="createStream">Create</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
      <v-col class="d-flex justify-center">
        <!-- DIALOG: Add a Stream by ID or URL -->
        <v-dialog v-model="showCreateStreamById">
          <template #activator="{ on, attrs }">
            <v-btn block class="pa-3" small min-width="163" v-bind="attrs" v-on="on">
              <v-icon dark left>mdi-link-plus</v-icon>
              Add By ID or URL
            </v-btn>
          </template>

          <v-card>
            <v-card-title class="text-h5">
              {{ `Add a ${$store.state.isFE2 ? 'Project' : 'Stream'} by ID or URL` }}
            </v-card-title>
            <v-card-text>
              {{
                $store.state.isFE2
                  ? 'Project IDs and Project/Model/Version URLs are supported.'
                  : 'Stream IDs and Stream/Branch/Commit URLs are supported.'
              }}
            </v-card-text>
            <v-container class="px-6">
              <v-text-field
                v-model="createStreamByIdText"
                xxxclass="small-text-field"
                hide-details
                dense
                flat
                :placeholder="$store.state.isFE2 ? 'Project URL' : 'Stream URL'"
              />
            </v-container>
            <v-card-actions>
              <v-spacer></v-spacer>
              <v-btn color="blue darken-1" text @click="showCreateStreamById = false">Cancel</v-btn>
              <v-btn
                :disabled="createStreamByIdText === ''"
                color="blue darken-1"
                text
                @click="getStream"
              >
                Add
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import gql from 'graphql-tag'
import { StreamWrapper } from '@/utils/streamWrapper'
import { createClient } from '../../vue-apollo'

export default {
  name: 'CreateStreamDialog',
  props: {
    accountId: {
      type: String,
      default: null
    },
    serverUrl: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      showCreateNewStream: false,
      showCreateStreamById: false,
      createStreamByIdText: '',
      privateStream: false,
      streamName: '',
      description: '',
      defaultDescription: 'Stream created from Excel',
      accountToCreateStream: null,
      streamId: ''
    }
  },
  computed: {
    loggedIn() {
      if (!this.$store.state) return false
      return this.$store.getters.isAuthenticated
    }
  },
  apollo: {
    $client: createClient()
  },
  methods: {
    async getStream() {
      try {
        const streamWrapper = new StreamWrapper(
          this.createStreamByIdText,
          this.accountId,
          this.serverUrl,
          this.$store.state.isFE2
        )
        this.$router.push(`/streams/${streamWrapper.streamId}/${streamWrapper.commitId}`)
      } catch (e) {
        console.log(e)
      }
      this.showCreateStreamById = false
    },
    async createStream() {
      let res = await this.$apollo.mutate({
        mutation: gql`
          mutation streamCreate($stream: StreamCreateInput!) {
            streamCreate(stream: $stream)
          }
        `,
        variables: {
          stream: {
            name: this.streamName,
            description: this.description === '' ? this.defaultDescription : this.description,
            isPublic: !this.privateStream
          }
        }
      })
      this.showCreateNewStream = false
      this.streamName = ''
      this.description = ''
      this.$mixpanel.track('Connector Action', { name: 'Create Stream' })
      return res
    }
  }
}
</script>

<style>
.center-content {
  display: flex;
  justify-content: center;
}
.v-dialog {
  max-width: 390px;
}
.v-text-field >>> input {
  font-size: 0.9em;
}
.v-text-field >>> label {
  font-size: 0.9em;
}
</style>
