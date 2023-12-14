import { NestFactory } from "@nestjs/core";
import { AppModule } from "./amo-intergration/amo-intergration.module";
import { ValidationPipe } from "@nestjs/common";


async function start() {
    const PORT = process.env.PORT || 5000;
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(new ValidationPipe({whitelist: true, transform: true}));

    await app.listen(PORT, () => console.log(`Server started on PORT = ${PORT}`));
}

start()
