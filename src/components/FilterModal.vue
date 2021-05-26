<template>
  <v-dialog v-model="show" persistent>
    <v-card class="mx-auto">
      <v-card-title>{{ title }}</v-card-title>
      <v-card-text class="mt-5">
        <p>
          {{ message }}
        </p>
        <v-text-field
          v-model="search"
          label="Search fields"
          flat
          dense
          hide-details
          clearable
          clear-icon="mdi-close-circle-outline"
        ></v-text-field>
        <v-treeview
          v-model="model"
          :items="items"
          :search="search"
          :filter="filter"
          :open.sync="openitems"
          open-on-click
          transition
          selectable
          dense
          selection-type="leaf"
          return-object
          class="mt-5"
        ></v-treeview>
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
    items: [],
    model: [],
    search: '',
    openitems: [0] //not working
  }),
  computed: {
    filter() {
      return (item, search, textKey) => item[textKey].indexOf(search) > -1
    },
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
      let items = this.model.map((x) => x.fullname)

      this.resolve({
        result: true,
        items: items
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
