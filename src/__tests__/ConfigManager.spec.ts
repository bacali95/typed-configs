import * as fs from "fs";
import * as path from "path";

import { Configs } from "../ConfigManager";
import { ExampleClass, ExtraExampleClass, removeConfigMetadata } from "./testHelpers";
import { addConfigField } from "../configMetadata";
import { SupportedConfigTypes } from "../types";

describe("ConfigManager", () => {
    afterEach(() => {
        Configs.removeAllConfigs();
        removeConfigMetadata(ExampleClass);
        removeConfigMetadata(ExtraExampleClass);
    });

    describe("add", () => {
        it("should throw if the class doesn't have any config fields added", () => {
            expect(() => Configs.add(ExampleClass, { configYmlPath: "" })).toThrow("Target ExampleClass doesn't have any config fields.");
        });

        describe("when config fields have been added", () => {
            let envVariables: Record<string, SupportedConfigTypes> = {};

            beforeEach(() => {
                Reflect.defineMetadata("design:type", String, ExampleClass.prototype, "propertyDefaultHelloWorld");
                addConfigField(
                    ExampleClass.prototype,
                    "propertyDefaultHelloWorld",
                    { required: false, name: "HELLO_WORLD", description: "X" },
                    true
                );
            });

            afterEach(() => {
                removeEnvVariables(envVariables);
                envVariables = {};
            });

            it("should succeed", () => {
                expect(() => Configs.add(ExampleClass, { configYmlPath: "" })).not.toThrow();
            });

            it("should throw if the class already has been added", () => {
                expect(() => Configs.add(ExampleClass, { configYmlPath: "" })).not.toThrow();

                expect(() => Configs.add(ExampleClass, { configYmlPath: "" })).toThrow("Class already added 'ExampleClass'");
            });

            it("should override default values with env variables", () => {
                // Arange
                envVariables = { HELLO_WORLD: "HeyWorld" };
                setEnvVariables(envVariables);

                // Act
                expect(() => Configs.add(ExampleClass, {})).not.toThrow();

                // Assert
                const configInstance = Configs.get(ExampleClass);
                expect(configInstance.propertyDefaultHelloWorld).toStrictEqual("HeyWorld");
            });

            it("should throw when the given config yml file doesn't exist", () => {
                expect(() => Configs.add(ExampleClass, { configYmlPath: "doesntexist" })).toThrow(
                    "Configuration file 'doesntexist' does not exist"
                );
            });

            describe("when there is a yml config file", () => {
                let ymlFileName = "local.yml";
                let ylmFilePath = path.join(path.resolve("."), ymlFileName);

                beforeEach(() => {
                    fs.writeFileSync(ylmFilePath, `HELLO_WORLD: "Yo World!"`);
                });

                afterEach(async () => {
                    fs.unlinkSync(ylmFilePath);
                });

                it("should override default values with yaml file variables", () => {
                    // Act
                    expect(() => Configs.add(ExampleClass, { configYmlPath: ylmFilePath })).not.toThrow();

                    // Assert
                    const configInstance = Configs.get(ExampleClass);
                    expect(configInstance.propertyDefaultHelloWorld).toStrictEqual("Yo World!");
                });

                it("should try to resolve the path to execution dir if no path was given", () => {
                    // Act
                    expect(() => Configs.add(ExampleClass, { configYmlPath: ymlFileName })).not.toThrow();

                    // Assert
                    const configInstance = Configs.get(ExampleClass);
                    expect(configInstance.propertyDefaultHelloWorld).toStrictEqual("Yo World!");
                });

                it("should override the values from the yml file with env variables if available", () => {
                    // Arange
                    envVariables = { HELLO_WORLD: "HeyWorld" };
                    setEnvVariables(envVariables);

                    // Act
                    expect(() => Configs.add(ExampleClass, { configYmlPath: ylmFilePath })).not.toThrow();

                    // Assert
                    const configInstance = Configs.get(ExampleClass);
                    expect(configInstance.propertyDefaultHelloWorld).toStrictEqual("HeyWorld");
                });
            });

            function setEnvVariables(envVariables: Record<string, SupportedConfigTypes>) {
                for (const varName in envVariables) {
                    process.env[varName] = "" + envVariables[varName];
                }
            }

            function removeEnvVariables(envVariables: Record<string, SupportedConfigTypes>) {
                for (const varName in envVariables) {
                    delete process.env[varName];
                }
            }
        });
    });

    describe("get", () => {
        it("should throw if the class hasn't been added to the Configs object yet", () => {
            expect(() => Configs.get(ExampleClass)).toThrow("Cannot find config instance for 'ExampleClass'");
        });

        it("should return the class instance when set", () => {
            Reflect.defineMetadata("design:type", String, ExampleClass.prototype, "propertyDefaultHelloWorld");
            addConfigField(
                ExampleClass.prototype,
                "propertyDefaultHelloWorld",
                { required: false, name: "HELLO_WORLD", description: "X" },
                true
            );
            Configs.add(ExampleClass, { configYmlPath: "" });

            expect(() => Configs.get(ExampleClass)).not.toThrow();
        });
    });

    describe("getConfigsDefintions", () => {
        it("should return an empty array if there are no configs", async () => {
            await expect(Configs.getConfigsDefinitions()).resolves.toEqual([]);
        });

        it("should return the class instance when set", async () => {
            // Arange
            Reflect.defineMetadata("design:type", String, ExampleClass.prototype, "propertyDefaultHelloWorld");
            addConfigField(
                ExampleClass.prototype,
                "propertyDefaultHelloWorld",
                { required: false, name: "HELLO_WORLD", description: "X" },
                true
            );

            Reflect.defineMetadata("design:type", String, ExtraExampleClass.prototype, "propertyDefaultFooBar");
            addConfigField(
                ExtraExampleClass.prototype,
                "propertyDefaultFooBar",
                { required: false, name: "FOO_BAR", description: "Y", recommendedValue: "Bar" },
                true
            );

            Configs.add(ExampleClass);
            Configs.add(ExtraExampleClass);

            // Act & Assert
            await expect(Configs.getConfigsDefinitions()).resolves.toEqual([
                { description: "X", name: "HELLO_WORLD", recommendedValue: undefined, required: false, type: "string" },
                { description: "Y", name: "FOO_BAR", recommendedValue: "Bar", required: false, type: "string" }
            ]);
        });
    });

    describe("takeSnapshot & restoreSnapshot", () => {
        it("should throw an error when the given class doesn't have any config fields", () => {
            expect(() => Configs.takeSnapshot(ExampleClass)).toThrow("Target ExampleClass doesn't have any config fields.");
            expect(() => Configs.restoreSnapshot(ExampleClass, {})).toThrow("Cannot find config instance for 'ExampleClass'");
        });

        it("should get and restore all the latest values", () => {
            // Arange: Setup configs with a value
            Reflect.defineMetadata("design:type", String, ExampleClass.prototype, "propertyDefaultHelloWorld");
            addConfigField(
                ExampleClass.prototype,
                "propertyDefaultHelloWorld",
                { required: false, name: "HELLO_WORLD", description: "X" },
                true
            );
            Reflect.defineMetadata("design:type", String, ExtraExampleClass.prototype, "propertyDefaultFooBar");
            addConfigField(
                ExtraExampleClass.prototype,
                "propertyDefaultFooBar",
                { required: false, name: "FOO_BAR", description: "Y", recommendedValue: "Bar" },
                true
            );
            Configs.add(ExampleClass);
            Configs.add(ExtraExampleClass);
            Configs.get(ExampleClass).propertyDefaultHelloWorld = "Hey World!";

            // Act: Take a snapshot per Config
            const exampleClassSnapshot = Configs.takeSnapshot(ExampleClass);
            const extraExampleClassSnapshot = Configs.takeSnapshot(ExtraExampleClass);

            // Assert
            expect(exampleClassSnapshot).toStrictEqual({ propertyDefaultHelloWorld: "Hey World!" });
            expect(extraExampleClassSnapshot).toStrictEqual({ propertyDefaultFooBar: "FooBar" });

            // Arange: Change current values
            Configs.get(ExampleClass).propertyDefaultHelloWorld = "Test data, bye world";
            Configs.get(ExtraExampleClass).propertyDefaultFooBar = "Test data, bar foo";

            // Assert: Check that current values have been changed and new snapshot won't change the other later on
            expect(Configs.takeSnapshot(ExampleClass)).toStrictEqual({ propertyDefaultHelloWorld: "Test data, bye world" });
            expect(Configs.takeSnapshot(ExtraExampleClass)).toStrictEqual({ propertyDefaultFooBar: "Test data, bar foo" });

            // Act: Restore the taken snapshots
            Configs.restoreSnapshot(ExampleClass, exampleClassSnapshot);
            Configs.restoreSnapshot(ExtraExampleClass, extraExampleClassSnapshot);
        });

        it("should throw an error when trying to restore unknown values", () => {
            // Arange: Setup config with a value
            Reflect.defineMetadata("design:type", String, ExampleClass.prototype, "propertyDefaultHelloWorld");
            addConfigField(
                ExampleClass.prototype,
                "propertyDefaultHelloWorld",
                { required: false, name: "HELLO_WORLD", description: "X" },
                true
            );
            Configs.add(ExampleClass);
            Configs.get(ExampleClass).propertyDefaultHelloWorld = "Hey World!";

            // Act
            expect(() => Configs.restoreSnapshot(ExampleClass, { unknownProperty: "value" })).toThrow(
                "Property 'unknownProperty' is unknown in config ExampleClass"
            );
        });
    });
});