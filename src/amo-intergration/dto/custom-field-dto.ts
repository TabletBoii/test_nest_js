import { IsIn } from "class-validator";


export class CustomFieldDto {

    // @IsIn(["leads", "contacts", "companies", "customer"], { message: "Type must be one of the following: leads, contacts, companies, customer" })
    readonly type: "leads" | "contacts" | "companies" | "customer";
}