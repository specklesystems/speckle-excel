<template>
  <v-app>
    <v-snackbar v-model="showSnackbar" bottom :color="snackbar.color" :timeout="snackbar.timeout">
      <span v-html="snackbar.message" />

      <template #action="">
        <v-btn text @click.native="showSnackbar = false">Close</v-btn>
      </template>
    </v-snackbar>

    <v-navigation-drawer v-if="user" v-model="drawer" app>
      <v-list-item>
        <v-list-item-avatar>
          <v-avatar color="background" size="38">
            <v-img v-if="user.avatar" :src="user.avatar" />
            <v-img v-else :src="`https://robohash.org/` + user.id + `.png?size=38x38`" />
          </v-avatar>
        </v-list-item-avatar>
        <v-list-item-content>
          <v-list-item-title>{{ user.name }}</v-list-item-title>
        </v-list-item-content>
      </v-list-item>

      <v-divider></v-divider>

      <v-list dense nav>
        <v-list-item v-for="item in items" :key="item.name" link :to="item.to">
          <v-list-item-icon>
            {{ item.icon }}
          </v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>{{ item.name }}</v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item :href="serverUrl" target="_blank">
          <v-list-item-icon>🌍</v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>
              Speckle Web App
              <v-icon x-small right class="mb-2">mdi-open-in-new</v-icon>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item href="https://speckle.community/" target="_blank">
          <v-list-item-icon>👪</v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>
              Community Forum
              <v-icon x-small right class="mb-2">mdi-open-in-new</v-icon>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item href="https://speckle.systems/tag/excel/" target="_blank">
          <v-list-item-icon>📺</v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>
              Tutorials
              <v-icon x-small right class="mb-2">mdi-open-in-new</v-icon>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>

        <v-list-item href="https://speckle.guide/user/excel.html" target="_blank">
          <v-list-item-icon>📚</v-list-item-icon>

          <v-list-item-content>
            <v-list-item-title>
              Docs
              <v-icon x-small right class="mb-2">mdi-open-in-new</v-icon>
            </v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>
    <v-app-bar app color="primary" dark>
      <v-app-bar-nav-icon v-if="isAuthenticated" @click="drawer = !drawer"></v-app-bar-nav-icon>
      <v-btn text to="/" active-class="no-active" class="pl-1">
        <v-img
          class="mr-1"
          contain
          max-height="30"
          max-width="30"
          src="./assets/logo-white30.png"
        />
        <span class="caption"><b>EXCEL</b></span>
        &nbsp;&nbsp;
        <span class="caption">CONNECTOR</span>
      </v-btn>
    </v-app-bar>

    <v-main :style="background">
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
const crypto = require('crypto')
export default {
  name: 'App',
  components: {},
  data: () => ({
    drawer: null,
    showSnackbar: false,
    items: [
      {
        name: 'Add stream',
        icon: '➕',
        to: '/add'
      },
      {
        name: 'Streams',
        icon: '📃',
        to: '/'
      },
      {
        name: 'SingleStreamDev',
        icon: '📃',
        to: '/singleStream'
      },
      {
        name: 'Log out',
        icon: '🏃‍♂️',
        to: '/logout'
      }
    ]
  }),
  computed: {
    isAuthenticated() {
      if (!this.$store.state) return false
      return this.$store.getters.isAuthenticated
    },
    serverUrl() {
      return this.$store.getters.serverUrl
    },
    user() {
      if (!this.$store.state) return null
      return this.$store.state.user.user
    },
    background() {
      let theme = this.$vuetify.theme.dark ? 'dark' : 'light'
      return `background-color: ${this.$vuetify.theme.themes[theme].background};`
    },
    snackbar() {
      //defaults
      var snackbar = {
        message: '',
        color: 'success',
        timeout: 2000
      }

      if (this.$store.state.snackbar.message) snackbar.message = this.$store.state.snackbar.message

      if (this.$store.state.snackbar.color) snackbar.color = this.$store.state.snackbar.color

      if (this.$store.state.snackbar.message) snackbar.timeout = this.$store.state.snackbar.timeout

      return snackbar
    }
  },
  watch: {
    snackbar() {
      if (this.snackbar.message) this.showSnackbar = true
    },
    isAuthenticated(newVal) {
      console.log(this.user)
      if (newVal) {
        this.initMixpanel()
      } else {
        this.$mixpanel.track('Connector Action', { name: 'Log Out' })
        this.$mixpanel.reset()
      }
    }
  },
  mounted() {
    console.log('launched')
    this.$mixpanel.track('Connector Action', { name: 'Launched', hostApp: 'excel' })
    if (this.isAuthenticated) this.initMixpanel()
  },
  methods: {
    initMixpanel() {
      let server_id = crypto
        .createHash('md5')
        .update(new URL(this.serverUrl).hostname.toLowerCase())
        .digest('hex')
        .toUpperCase()

      let distinct_id =
        '@' +
        crypto.createHash('md5').update(this.user.email.toLowerCase()).digest('hex').toUpperCase()

      console.log(server_id)
      console.log(distinct_id)

      this.$mixpanel.register({ server_id: server_id, hostApp: 'excel', type: 'action' })

      this.$mixpanel.identify(distinct_id)
      this.$mixpanel.track('Connector Action', { name: 'Log In' })
    }
  }
}
</script>
<style>
.no-active::before {
  background-color: transparent !important;
}

/* TOOLTIPs */

.tooltip {
  display: block !important;
  z-index: 10000;
  font-family: 'Roboto', sans-serif !important;
  font-size: 0.75rem !important;
}

.tooltip .tooltip-inner {
  background: rgba(0, 0, 0, 0.5);
  color: white;
  border-radius: 16px;
  padding: 5px 10px 4px;
}

.tooltip .tooltip-arrow {
  width: 0;
  height: 0;
  border-style: solid;
  position: absolute;
  margin: 5px;
  border-color: rgba(0, 0, 0, 0.5);
  z-index: 1;
}

.tooltip[x-placement^='top'] {
  margin-bottom: 5px;
}

.tooltip[x-placement^='top'] .tooltip-arrow {
  border-width: 5px 5px 0 5px;
  border-left-color: transparent !important;
  border-right-color: transparent !important;
  border-bottom-color: transparent !important;
  bottom: -5px;
  left: calc(50% - 5px);
  margin-top: 0;
  margin-bottom: 0;
}

.tooltip[x-placement^='bottom'] {
  margin-top: 5px;
}

.tooltip[x-placement^='bottom'] .tooltip-arrow {
  border-width: 0 5px 5px 5px;
  border-left-color: transparent !important;
  border-right-color: transparent !important;
  border-top-color: transparent !important;
  top: -5px;
  left: calc(50% - 5px);
  margin-top: 0;
  margin-bottom: 0;
}

.tooltip[x-placement^='right'] {
  margin-left: 5px;
}

.tooltip[x-placement^='right'] .tooltip-arrow {
  border-width: 5px 5px 5px 0;
  border-left-color: transparent !important;
  border-top-color: transparent !important;
  border-bottom-color: transparent !important;
  left: -5px;
  top: calc(50% - 5px);
  margin-left: 0;
  margin-right: 0;
}

.tooltip[x-placement^='left'] {
  margin-right: 5px;
}

.tooltip[x-placement^='left'] .tooltip-arrow {
  border-width: 5px 0 5px 5px;
  border-top-color: transparent !important;
  border-right-color: transparent !important;
  border-bottom-color: transparent !important;
  right: -5px;
  top: calc(50% - 5px);
  margin-left: 0;
  margin-right: 0;
}

.tooltip.popover .popover-inner {
  background: #f9f9f9;
  color: black;
  padding: 24px;
  border-radius: 5px;
  box-shadow: 0 5px 30px rgba(black, 0.1);
}

.tooltip.popover .popover-arrow {
  border-color: #f9f9f9;
}

.tooltip[aria-hidden='true'] {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.15s, visibility 0.15s;
}

.tooltip[aria-hidden='false'] {
  visibility: visible;
  opacity: 1;
  transition: opacity 0.15s;
}
</style>
