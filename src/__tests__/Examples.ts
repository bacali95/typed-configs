import * as fs from "fs";

import { Configs } from "../ConfigManager";
import { Config, ConfigValue } from "../decorators";

@Config({ configYmlPath: "configs/test.yml" })
export class Communicator {
    @ConfigValue({
        name: "GREETING",
        description: "They way you say hi to others",
        required: true,
        recommendedValue: "Hello"
    })
    greeting!: string;

    @ConfigValue({
        name: "GOODBYE_MESSAGE",
        description: "The way you say goodbye. Optional.",
        required: false
    })
    goodbye: string = "/me left the chat";

    @ConfigValue({
        name: "IDLE_SOUND",
        description: "What do you say when doing nothing?",
        required: false,
        fdsf: 
    })
    idleMessage?: string;

    nonConfigProperty = "I don't need a type because I don't matter.";
}

Configs.getConfigsDefinitions().then(definitions => {
    fs.writeFileSync("configDefinitions.json", JSON.stringify(definitions));
});
