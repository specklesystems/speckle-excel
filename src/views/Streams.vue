<template>
  <v-container>
    <v-row>
      <v-col cols="12">
        <v-card elevation="0" color="transparent">
          <v-card-text class="mt-0 pt-3">
            <div v-for="(stream, i) in streams" :key="i">
              <stream-card :stream-id="stream"></stream-card>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import StreamCard from '../components/StreamCard'

export default {
  name: 'Streams',

  components: {
    StreamCard
  },
  computed: {
    streams() {
      return this.$store.state.streams
    }
  },
  mounted() {},
  methods: {}
}
</script>
