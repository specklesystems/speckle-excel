import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },

  {
    path: '/streams/:streamId/commits/:commitId',
    name: 'commit',
    meta: {
      title: 'Commit | Speckle'
    },
    component: () => import('../views/Commit.vue')
  },
  { path: '*', redirect: '/' } // catch all use case
  // {
  //   path: '*',
  //   name: 'Home',
  //   component: Home
  // }
]

const router = new VueRouter({
  mode: 'history',
  routes
})

export default router
