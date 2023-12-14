import { IsOptional, IsString } from "class-validator";

export class UserEntityDto {

    @IsOptional()
    @IsString()
    readonly name: string;

    @IsOptional()
    @IsString()
    readonly email: string;

    @IsOptional()
    @IsString()
    readonly phone: string;

}