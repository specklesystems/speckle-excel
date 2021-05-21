<template>
  <v-dialog v-model="show" width="500" persistent>
    <v-card class="mx-auto">
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text class="mt-5">
        <p>
          {{ message }}
        </p>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn text @click="cancel">Cancel</v-btn>
        <v-btn color="primary" text @click="agree">OK</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
<script>
export default {
  data: () => ({
    dialog: false,
    title: '',
    message: ''
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
    open(title, message) {
      this.title = title
      this.message = message
      this.dialog = true

      return new Promise((resolve, reject) => {
        this.resolve = resolve
        this.reject = reject
      })
    },
    agree() {
      this.resolve({
        result: true
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
