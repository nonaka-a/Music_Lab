const { Offline, Sampler, loaded } = require("tone");
(async () => {
  const buffer = await Offline(async () => {
    const drums = new Sampler({
      urls: { "C1": "kick.mp3" },
      baseUrl: "https://tonejs.github.io/audio/drum-samples/CR78/"
    });
    // drums.toDestination(); // Wait toDestination depends on context
  }, 1);
})();
