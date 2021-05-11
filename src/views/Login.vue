<template>
  <v-container style="height: 100%">
    <v-row align="center" style="height: 100%">
      <v-col class="py-2" align="center">
        <span class="subtitle">
          Hello!
          <br />
          Please log in or create an account below
          <br />
          👇
        </span>
        <br />
        <v-btn large class="mt-5" color="primary" @click="login">Log in</v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
export default {
  name: 'Login',

  methods: {
    login() {
      this.$store.dispatch('login')
    }
  }
}
</script>
