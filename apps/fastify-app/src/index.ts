import Fastify from 'fastify';
const fastify = Fastify({ logger: true });

fastify.get('/', async (req, res) => {
  return {
    hello: 'world'
  };
});
(async () => {
  try {
    await fastify.listen(3000);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
})();
