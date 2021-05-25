<template>
  <v-dialog v-model="show" width="500" persistent>
    <v-card class="mx-auto">
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text class="mt-5">
        <p>
          {{ message }}, you can filter them below or
          <a @click="model = items">select all columns.</a>
        </p>
        <p>This list shows the first element of each column, which most likely is a header.</p>
        <v-autocomplete
          v-model="model"
          :items="items"
          rounded
          filled
          dense
          flat
          multiple
          hide-no-data
          hide-details
          placeholder="Search headers"
          clearable
          append-icon="mdi-filter-variant"
          class="caption"
        ></v-autocomplete>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn text @click="cancel">Cancel</v-btn>
        <v-btn :disabled="!model || model.length === 0" color="primary" text @click="agree">
          Ok
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
export default {
  data: () => ({
    dialog: false,
    title: '🙌 A lot of data is coming in!',
    message: 'You are about to receive 35 columns and 205 rows',
    items: ['width', 'family', 'line.start', 'line.start.x', 'volume'],
    model: null
  }),
  computed: {
    show: {
      get() {
        return this.dialog
      },
      set(value) {
        this.dialog = value
        if (value === false) {
          this.cancel()
        }
      }
    }
  },
  methods: {
    open(items, message) {
      this.items = items
      this.message = message
      this.dialog = true

      return new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      })
    },
    agree() {
      this.resolve({
        result: true,
        items: this.model
      })
      this.dialog = false
    },
    cancel() {
      this.resolve({
        result: false
      })
      this.dialog = false
    }
  }
}
</script>
