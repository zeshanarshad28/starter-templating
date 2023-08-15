const lambdaQuery = require("./Utils/queryLambda")
const TxQuery = require("./txQuery")
const { models, inferModels, schemas } = TxQuery.internals
const io = require("socket.io")();

const queries = {}
const lastResult = {}
let watched = false

const getQueryModels = async (q) => {
  await inferModels()
  watchModels()

  const allQueryModels = []
  function go(k, q) {
    const realQ = q.__postprocessors ? q.query : q
    allQueryModels.push(k)
    const schema = schemas[k]
    for(const k in realQ) {
      if(schema[k]?.ref) go(schema[k].ref, realQ[k])
      else if(schema[k]?.[0]?.ref) go(schema[k]?.[0]?.ref, realQ[k])
    }
  }
  for(const k in q) q[k].__postprocessors ? go(k, q[k].query) : go(k, q[k])
  return allQueryModels
}

io.sockets.on("connect", async (socket) => {
  console.log(`Connected to ${socket.id}`);

  socket.on(
    "watch",
    async q => {
      try {
        const jsonq = JSON.stringify(q)

        if(!queries[jsonq]) queries[jsonq] = await getQueryModels(q)
        const queryModels = queries[jsonq]
        console.log(queryModels)

        socket.join(jsonq)

        const [result] = await lambdaQuery([q], "")
        socket.emit("change", result)
        lastResult[jsonq] = JSON.stringify(result)
      } catch (e) {
        socket.emit("error", e)
        console.error(e)
      }
    }
  )

  socket.on(
    "unwatch",
    async (q) => {
      const jsonq = JSON.stringify(q)
      socket.leave(jsonq)
      const clients = await io.in(jsonq).fetchSockets()
      if(clients.length == 0) {
        delete queries[jsonq]
        delete lastResult[jsonq]
      }
    })
})

function watchModels() {
  if(!watched) {
    Object.entries(models).forEach(([name, model]) => {
      model.watch()
        .on("change", async _ => {
          const foundQueries = Object.entries(queries).filter(([_, usedModels]) => usedModels.includes(name)).map(([jsonq, _]) => jsonq)
          if(!foundQueries.length) return
          const results = await lambdaQuery(foundQueries.map(x => JSON.parse(x)), "")
          const changeResults = results.map((res, i) => [foundQueries[i], res]).filter(([jsonq, res]) => {
            const bool = lastResult[jsonq] != JSON.stringify(res)
            lastResult[jsonq] = JSON.stringify(res)
            return bool
          })
          for(const [jsonq, res] of changeResults)
            io.to(jsonq).emit("change", res)
        })
    })
    watched = true
  }
}

module.exports = { io };