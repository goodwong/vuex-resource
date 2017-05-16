/**
 * 通用RESTful资源模板
 *
 * 缓存的难点：
 * 1. 有些api结构是`categories/${category_id}/templates`，这个可以通过传递额外的id处理
 *    但是api的结构会有点问题，建议后端统一按 `templates?category_id=13`的方式，适用性高
 * 2. 有些api有复杂的查询参数，如search，这种缓存意义不大，加参数 { cache: false }
 * 3. 翻页器的缓存也不容易处理，或者将parent设置为`${category_id}-${page_id}`？
 * 4. 若缓存了，则create/destroy需要增删lists里的内容，这个如何解决？传递parent参数
 */

import Vue from 'vue'

export default function builder (api) {
  function get (params) {
    return Vue.http.get(`${api}`, { params }).then(r => r.json())
  }

  function find (id) {
    return Vue.http.get(endpoint(api, id)).then(r => r.json())
  }

  function create (payload) {
    return Vue.http.post(`${api}`, payload).then(r => r.json())
  }

  function update (id, payload) {
    return Vue.http.put(endpoint(api, id), payload).then(r => r.json())
  }

  function destroy (id) {
    return Vue.http.delete(endpoint(api, id))
  }

  function endpoint (endpoint, id) {
    if (endpoint.indexOf('?') > -1) {
      return endpoint.replace(/\?/, `/${id}?`)
    } else {
      return endpoint + `/${id}`
    }
  }

  return {
    namespaced: true,

    state: {
      items: {
        /* id: item */
      },
      lists: {
        /* parent_id: [id, id, ...] */
      }
    },

    actions: {
      LOAD ({ state, commit }, payload) {
        payload = payload || {}
        let { parent, params, cache } = payload
        parent = parent || 'defalut'
        cache = typeof cache === 'undefined' ? true : cache
        let ids = state.lists[parent]
        if (ids && cache) {
          return Promise.resolve(ids.map(id => state.items[id]))
        }
        return get(params)
        .then(items => {
          commit('SET', items)
          if (cache) {
            commit('SET_LIST', { parent, list: items.map(i => i.id) })
          }
          return items
        })
      },
      FIND ({ state, commit }, { id, refresh }) {
        let item = state.items[id]
        if (item && !refresh) {
          return Promise.resolve(item)
        }
        return find(id)
        .then(item => {
          commit('SET_ITEM', item)
          return item
        })
      },
      CREATE ({ state, commit }, { parent, params, payload }) {
        parent = parent || 'defalut'
        return create(payload)
        .then(item => {
          commit('SET_ITEM', item)
          if (state.lists[parent]) {
            commit('APPEND_LIST', { parent, id: item.id })
          }
          return item
        })
      },
      UPDATE ({ state, commit }, { id, payload }) {
        return update(id, payload)
        .then(item => {
          commit('SET_ITEM', item)
          return item
        })
      },
      DELETE ({ state, commit }, { parent, id }) {
        parent = parent || 'defalut'
        return destroy(id)
        .then(() => {
          commit('DEL_ITEM', id)
          if (state.lists[parent]) {
            commit('REMOVE_LIST_ITEM', { parent, id })
          }
        })
      }
    },

    mutations: {
      SET_LIST (state, { parent, list }) {
        Vue.set(state.lists, parent, list)
      },
      APPEND_LIST (state, { parent, id }) {
        state.lists[parent].push(id)
      },
      REMOVE_LIST_ITEM (state, { parent, id }) {
        let index = state.lists[parent].indexOf(id)
        state.lists[parent].splice(index, 1)
      },
      SET (state, items) {
        items.forEach(item => {
          Vue.set(state.items, item.id, item)
        })
      },
      SET_ITEM (state, item) {
        Vue.set(state.items, item.id, item)
      },
      DEL_ITEM (state, id) {
        Vue.delete(state.items, id)
      }
    },

    getters: {
      list: (state) => (parent) => {
        parent = parent || 'defalut'
        let list = state.lists[parent]
        return list ? list.map(i => state.items[i]).sort((a, b) => a.id - b.id) : []
      }
    }
  }
}
