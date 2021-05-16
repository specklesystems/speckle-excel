<template>
  <v-container>
    <v-row>
      <v-col class="py-2">
        <v-btn text large color="primary" to="/">
          <v-icon dark>mdi-chevron-left</v-icon>
          back
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="pt-0">
        <v-card v-if="stream">
          <v-card-subtitle class="caption text-uppercase pb-0">Receiving from:</v-card-subtitle>
          <v-card-title>{{ stream.name }}</v-card-title>
          <v-card-subtitle>
            {{ stream.commit.message }}
          </v-card-subtitle>
          <v-card-text>
            <v-chip outlined small>
              <v-icon small class="mr-2 float-left">mdi-source-commit</v-icon>
              {{ stream.commit.id }}
            </v-chip>
            <v-chip outlined class="ml-2" small>
              <v-icon small class="mr-2 float-left">mdi-clock-time-four-outline</v-icon>
              <timeago :datetime="stream.commit.createdAt"></timeago>
            </v-chip>
            <br />
            <br />
            <i>
              Expand the data below and click the
              <v-icon x-small>mdi-download</v-icon>
              icon to receive flattened data in the selected cell.
            </i>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12" class="pt-0">
        <v-card elevation="0" color="transparent">
          <object-speckle-viewer
            v-if="stream"
            :stream-id="stream.id"
            :object-id="stream.commit.referencedObject"
            :value="commitObject"
            :expand="true"
          ></object-speckle-viewer>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
import ObjectSpeckleViewer from '../components/ObjectSpeckleViewer'
import commitQuery from '../graphql/commit.gql'

export default {
  name: 'Commit',
  components: {
    ObjectSpeckleViewer
  },
  apollo: {
    stream: {
      prefetch: true,
      query: commitQuery,
      variables() {
        // Use vue reactive properties here
        return {
          streamid: this.$route.params.streamId,
          id: this.$route.params.commitId
        }
      }
    }
  },
  computed: {
    commitObject() {
      return {
        // eslint-disable-next-line camelcase
        speckle_type: 'reference',
        referencedId: this.stream.commit.referencedObject
      }
    }
  }
}
</script>
