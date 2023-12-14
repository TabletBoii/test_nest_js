import { Module } from '@nestjs/common';
import { ApiController } from './amo-intergration.controller';
import { AppService } from './amo-intergration.service';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios'
import * as fs_extra from "fs-extra";
import * as yaml from 'js-yaml';
import { join } from 'path'


async function loadYAMLConfig() {
    try {
        const YAML_CONFIG_FILENAME = join(process.cwd(), "src", "config.yaml");
        const fileContents = await fs_extra.readFile(YAML_CONFIG_FILENAME, 'utf8');
        return yaml.load(fileContents) as Record<string, any>;
    } catch (error) {
        console.error('Error loading YAML config:', error);
        throw error;
    }
}

export async function setDataToYamlFile(filePath: string, dataToLoad: any): Promise<void> {
    try {
        const fileContents = await fs_extra.readFile(filePath, 'utf8');
        const data = yaml.load(fileContents)

        Object.assign(data, dataToLoad)

        const newYaml = yaml.dump(data)
        await fs_extra.writeFile(filePath, newYaml, 'utf8');
    } catch (error) {
        console.error("Error setting data to YAML file", error)
        throw error;
    }
}

@Module({
    controllers: [ApiController],
    providers: [AppService],
    imports: [
        ConfigModule.forRoot({ 
            isGlobal: true,
            load: [loadYAMLConfig]
        }),
        HttpModule,
        AppModule
],
})
export class AppModule {

}