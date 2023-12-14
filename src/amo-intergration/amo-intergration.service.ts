import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosRequestConfig } from 'axios';
import { map } from 'rxjs/operators';
import { lastValueFrom } from 'rxjs/internal/lastValueFrom';
import { setDataToYamlFile } from '../amo-intergration/amo-intergration.module'
import * as path from 'path';
import { UserEntityDto } from './dto/user-entity.dto';
import { CustomFieldDto } from './dto/custom-field-dto';



@Injectable()
export class AppService {
    constructor(
        private configService: ConfigService,
        private httpService: HttpService
    ) {}
    
    private async sendRequest(axiosConfig: AxiosRequestConfig): Promise<any> {
        return await lastValueFrom(this.httpService.request(axiosConfig))
        .then((res) => res.data)
        .catch((e) => {
          console.log(e);
        });
    }

    private async postData(url: string, data: object, options?: AxiosRequestConfig): Promise<any> {
        const response = await lastValueFrom(
            this.httpService.post(url, data, options).pipe(map((res) => res.data))
        )
        return response
    }

    async getCustomFields(customFieldsAttachment: string) {
        const customFieldsArray: object[] = [];
        await this.amoTokenValidation()
        const axiosConfig: AxiosRequestConfig  = {
            method: 'get',
            url: process.env.defaultApiUrl+`/${customFieldsAttachment}/custom_fields`,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.accessToken}`,
            },
            validateStatus: function (status: number) {
                return status === 200 || status === 204;;
            },
        }
        let response = await this.sendRequest(axiosConfig)

        for(let item of response._embedded.custom_fields) {
            customFieldsArray.push(item)
        }

        return customFieldsArray
    }

    private async createUser(userEntity: UserEntityDto, userFirstName: string, userLastName: string, targetUrl: string): Promise<number> {
        await this.amoTokenValidation()
        await this.sendRequest({
            method: 'post',
            url: process.env.contactUrl,
            headers: {
                Authorization: `Bearer ${process.env.accessToken}`,
            },
            data: [
                {
                    "first_name": userFirstName,
                    "last_name": userLastName,
                    "custom_fields_values": [
                        {
                            "field_id": 537315,
                            "values": [
                                {
                                    "value": userEntity.phone,
                                    "enum_code": "WORK"
                                }
                            ]
                        },
                        {
                            "field_id": 537317,
                            "values": [
                                {
                                    "value": userEntity.email,
                                }
                            ]
                        }
                    ],
                }
            ],
            validateStatus: function (status: number) {
                return status === 200 || status === 204;;
            }
        })
        let userID = (await this.checkUser(targetUrl))["_embedded"]["contacts"][0]["id"]
        return userID

    }
    private async checkUser(targetUrl: string): Promise<number>{
        return await this.sendRequest({
            method: 'GET',
            url: targetUrl,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.accessToken}`,
            },
            validateStatus: function (status: number) {
                return status === 200 || status === 204;;
            },
        })
    }
    private async updateUser(userEntity: UserEntityDto, userIdToChange: number, userFirstName: string, userLastName: string) {
        await this.amoTokenValidation()
        await this.sendRequest({
            method: 'PATCH',
            url: process.env.contactUrl,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.accessToken}`,
            },
            data: [{
                "id": userIdToChange,
                "first_name": userFirstName,
                "last_name": userLastName,
                "custom_fields_values": [
                    {
                        "field_id": 537315,
                        "values": [
                            {
                                "value": userEntity.phone,
                                "enum_code": "WORK"
                            }
                        ]
                    },
                    {
                        "field_id": 537317,
                        "values": [
                            {
                                "value": userEntity.email,
                            }
                        ]
                    }
                ],
            }],
            validateStatus: function (status: number) {
                return status === 200 || status === 204;
            },
        })
    }
        
    private async createDeal(userEntity: UserEntityDto, userID: number) {
        await this.amoTokenValidation()
        console.log(process.env.createDealUrl)
        await this.sendRequest({
            method: 'POST',
            url: process.env.createDealUrl,
            headers: {
                Authorization: `Bearer ${process.env.accessToken}`,
            },
            data: [{
                "name": `${userEntity.name} deal`,
                "created_by": 0,
                "price": 20000,
                "_embedded":{
                    "contacts": [{
                          "id":userID,
                    }],
                 },
            }],
            validateStatus: function (status: number) {
                return status === 200 || status === 204;
            },
        })
    }

    async usernameData(userEntity: UserEntityDto) {
        let fullName = userEntity.name.split(/(?=[A-Z])/);
        let userFirstName = fullName[1];
        let userLastName = fullName[0];

        let targetUrl = process.env.contactUrl + '?query=' + userEntity.phone;
        await this.amoTokenValidation()
        
        let existingContact = await this.checkUser(targetUrl)
        let userId: number;
        if (!existingContact){
            userId = await this.createUser(userEntity, userFirstName, userLastName, targetUrl);
            await this.createDeal(userEntity, userId);
            return "User was succesfully created, deal created"
        }

        userId = existingContact["_embedded"]["contacts"][0]["id"]
        await this.updateUser(userEntity, userId, userFirstName, userLastName);
        await this.createDeal(userEntity, userId);
        return "User data was succesfully changed, deal created"
  
    }

    async getCrmToken(code: string) {
        let response: Promise<any>;
        setDataToYamlFile(
            path.join(process.cwd(), "src", "config.yaml"), 
            {"o_auth_token": code}
        )
        
        try{
            response = await this.postData(
                process.env.accessTokenUrl,
                {
                    "client_id": this.configService.get<string>("intergration_id"),
                    "client_secret": this.configService.get<string>("sercet_key"),
                    "grant_type": "authorization_code",
                    "code": this.configService.get<string>("o_auth_token"),
                    "redirect_uri": process.env.redirectUrl
                }
            )
        } catch(err){
            console.log(err)
        }
        console.log(process.cwd())
        setDataToYamlFile(
            path.join(process.cwd(), "src", "config.yaml"), 
            {"refresh_token": response["refresh_token"]}
        )
        process.env.tokenExpiryTime = response["expires_in"].toString();
        process.env.tokenReceiveDateTime = Date.now().toString();
        process.env.accessToken = response["access_token"];
    }

    async refreshAccessToken() {
        let response: Promise<any>;
        try {
            response = await this.postData(
                process.env.refreshTokenUrl,
                {
                    "client_id": this.configService.get<string>("intergration_id"),
                    "client_secret": this.configService.get<string>("sercet_key"),
                    "grant_type":"refresh_token",
                    "refresh_token": this.configService.get<string>("refresh_token"),
                    "redirect_uri": process.env.redirectUrl
                }
            )
        } catch (error) {
            console.log(error);
            throw error;
        }

        setDataToYamlFile(
            path.join(process.cwd(), "src", "config.yaml"), 
            {"refresh_token": response["refresh_token"]}
        )
        process.env.tokenExpiryTime = response["expires_in"].toString();
        process.env.tokenReceiveDateTime = Date.now().toString();
        process.env.accessToken = response["access_token"];
    }

    private async amoTokenValidation(): Promise<void> {
        let tokenExpiryTime = parseInt(process.env.tokenExpiryTime)
        let tokenReceiveDateTime = parseInt(process.env.tokenReceiveDateTime)
        let currentDateTime = Date.now()
        if((currentDateTime - tokenReceiveDateTime)/1000 > tokenExpiryTime || process.env.accessToken === "none"){
            await this.refreshAccessToken()
        }
    }
}
