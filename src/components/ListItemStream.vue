<template>
  <v-card
    v-if="stream.commits.items.length > 0"
    class="pa-5 mb-3"
    style="transition: all 0.2s"
    :to="`/streams/${stream.id}/commits/${stream.commits.items[0].id}`"
  >
    <v-row>
      <v-col cols="12" sm="8" class="align-self-center">
        <div class="subtitle-1 stream-link">
          {{ stream.name }}
        </div>
        <div class="caption mb-2 mt-1 text-truncate">
          {{ stream.description }}
        </div>

        <div>
          <span class="caption mb-2 font-italic">
            Updated
            <timeago :datetime="stream.updatedAt"></timeago>
          </span>
          <v-chip small outlined class="ml-3">
            <v-icon small left>mdi-account-key-outline</v-icon>
            {{ role }}
          </v-chip>
          <v-btn
            v-tooltip="
              stream.branches.totalCount +
              ' branch' +
              (stream.branches.totalCount === 1 ? '' : 'es')
            "
            plain
            color="primary"
            text
            class="px-0 ml-3"
            small
          >
            <v-icon small class="mr-2 float-left">mdi-source-branch</v-icon>
            {{ stream.branches.totalCount }}
          </v-btn>

          <v-btn
            v-tooltip="
              stream.commits.totalCount + ' commit' + (stream.commits.totalCount === 1 ? '' : 's')
            "
            plain
            color="primary"
            text
            class="px-0"
            small
          >
            <v-icon small class="mr-2 float-left">mdi-source-commit</v-icon>
            {{ stream.commits.totalCount }}
          </v-btn>
        </div>
        <!-- <v-icon v-if="stream.isPublic" v-tooltip="`Link sharing on`" small>mdi-link</v-icon>
        <v-icon v-else v-tooltip="`Link sharing off`" small>mdi-shield-lock</v-icon> -->
      </v-col>
      <v-col cols="12" sm="4" class="text-sm-center text-md-right align-self-center">
        <div>
          <user-avatar
            v-for="user in collaboratorsSlice"
            :id="user.id"
            :key="user.id"
            :avatar="user.avatar"
            :size="30"
            :name="user.name"
          />
          <div v-if="stream.collaborators.length > collaboratorsSlice.length" class="d-inline">
            <v-avatar class="ma-1 grey--text text--darken-2" color="grey lighten-3" size="30">
              <b>+{{ stream.collaborators.length - collaboratorsSlice.length }}</b>
            </v-avatar>
          </div>
        </div>
      </v-col>
    </v-row>
  </v-card>
</template>
<script>
import UserAvatar from '../components/UserAvatar'
//import gql from 'graphql-tag'
import commitQuery from '../graphql/commit.gql'
//import objectQuery from '../graphql/object.gql'
//import flatten from 'flat'

export default {
  components: { UserAvatar },
  props: {
    stream: {
      type: Object,
      default: function () {
        return {}
      }
    }
  },
  computed: {
    collaboratorsSlice() {
      let limit = 18
      switch (this.$vuetify.breakpoint.name) {
        case 'xs':
          limit = 10
          break
        case 'sm':
          limit = 9
          break
        case 'md':
          limit = 8
          break
        case 'lg':
          limit = 12
          break
        case 'xl':
          limit = 18
          break
      }

      if (this.stream.collaborators.length > limit)
        return this.stream.collaborators.slice(0, limit - 1)
      return this.stream.collaborators
    },
    role() {
      return this.stream.role.replace('stream:', '')
    }
  },
  methods: {
    async receiveStream() {
      let res = await this.$apollo.query({
        query: commitQuery,
        variables: {
          streamid: this.stream.id,
          id: this.stream.commits.items[0].id
        }
      })

      let loader = await this.$store.dispatch('getObject', {
        streamId: this.stream.id,
        objectId: res.data.stream.commit.referencedObject
      })

      window.Excel.run(async (context) => {
        var sheet = context.workbook.worksheets.getActiveWorksheet()
        sheet.load('items/name')

        let rowIndex = 1

        let ignoredProps = ['reference', 'totalChildrenCount']
        let headers = []
        for await (let obj of loader.getObjectIterator()) {
          if (obj.totalChildrenCount > 0) continue

          //var flat = flatten(obj)

          for (const [key, value] of Object.entries(obj)) {
            if (ignoredProps.includes(key)) continue

            let colIndex = headers.findIndex((x) => x === key)
            if (colIndex === -1) {
              colIndex = headers.length
              let keyRange = sheet.getCell(0, colIndex)
              keyRange.values = key
              headers.push(key)
            }

            let valueRange = sheet.getCell(rowIndex, colIndex)
            valueRange.values = JSON.stringify(value)
          }
          rowIndex++
          //console.log(obj, `Progress: ${count++}/${total}`)
        }

        // sheet.tables.load('items')

        // let objectTable = null

        // objectTable = sheet.tables.getItemOrNullObject('SpeckleTable_' + this.stream.id)

        // objectTable.rows.load('items')
        // objectTable.columns.load('items')

        await context.sync()
      })
    }
  }
}
</script>
<style scoped>
.stream-link a {
  /* color: inherit; */
  text-decoration: none;
  font-weight: 500;
}

.stream-link a:hover {
  text-decoration: underline;
}
</style>
