<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card elevation="0" color="transparent">
          <object-speckle-viewer
            v-if="stream"
            class="mt-4"
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
