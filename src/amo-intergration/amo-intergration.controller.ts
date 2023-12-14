import { Controller, Get, Post, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { AppService } from '../amo-intergration/amo-intergration.service';
import { CustomFieldDto } from './dto/custom-field-dto';
import { UserEntityDto } from './dto/user-entity.dto';

@Controller('api')
export class ApiController {

    constructor(private appService: AppService) {}

    @UsePipes(ValidationPipe)
    @Get("users")
    async getUsernameData(
        // @Query("name") userName: string,
        // @Query("email") userEmail: string,
        // @Query("phone") userPhone: string
        @Query() userEntity: UserEntityDto
    ) {
        return await this.appService.usernameData(userEntity);
    }

    @Get("crm_token")
    async getCrmTokem(@Query("code") code: string) {
        return this.appService.getCrmToken(code);
    }

    @Get("custom_fields")
    async getCustomFields(
        @Query("customFieldsAttachment") customFieldsAttachment: string,
    ) {
        return this.appService.getCustomFields(customFieldsAttachment)
    }
}
