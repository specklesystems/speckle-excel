<template>
  <v-container style="height: 100%">
    <v-row align="center" style="height: 100%">
      <v-col class="py-2" align="center">
        <span class="subtitle">
          Hello!
          <br />
          Welcome to the Speckle connector for Excel 📊
          <br />
          <br />
        </span>
        <span class="caption">
          Please login or register below to start streaming data.
          <br />
          New here? Make sure to
          <a href="https://speckle.guide/user/excel.html" target="_blank">check our docs!</a>
          📚
          <br />
        </span>
        <span class="subtitle">👇</span>
        <br />
        <v-form ref="form" v-model="validForm" lazy-validation @submit.prevent="login">
          <v-text-field
            v-model="serverUrl"
            :error-messages="serverError"
            class="mt-5 mb-5"
            label="Speckle Server Address"
            :autofocus="true"
            required
            :rules="serverUrlRules"
          ></v-text-field>
          <v-btn large class="mt-5" color="primary" type="submit">Login</v-btn>
        </v-form>
        <span class="caption">
          <br />
        </span>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  name: 'Login',
  data: () => ({
    serverUrl:
      process.env.NODE_ENV === 'development' ? 'https://latest.speckle.dev' : 'https://speckle.xyz',
    validForm: true,
    serverError: '',
    serverUrlRules: [
      (v) => !!v || 'Server URL is required',
      (v) =>
        new RegExp(/^https?:\/\/([\w-.]{2,})(\.([a-zA-Z]{2,})|(:\d{4}))$/g).test(v) ||
        'URL must be valid, with no trailing slash'
    ]
  }),
  mounted() {},

  methods: {
    async login() {
      //when for is not visible (coming from web) don't validate
      if (this.$refs.form && !this.$refs.form.validate()) return

      this.$store.dispatch('login', this.serverUrl)
    }
  }
}
</script>
