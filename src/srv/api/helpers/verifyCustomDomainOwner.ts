import {readFileSync} from "fs";
import {createHash} from "crypto";
import {resolveTxt} from "dns/promises";

const secrets = JSON.parse(readFileSync("./src/secrets.json").toString());

if(!secrets.custom_domain_random) {
    console.error(`NO CUSTOM DOMAIN RANDOM VALUE!`);
    process.exit(1);
}

const domain_random = secrets.custom_domain_random as string;

/**
 * Verify the ownership of a custom domain.
 * @param id {string}
 * @param domain {string}
 */
export default async function verifyCustomDomainOwner(id: string, domain: string): Promise<boolean> {
    //this helps avoid tempmail detection by using a random domain value
    const hash = createHash("SHA512").update(id + (domain_random).repeat(2) + domain);
    
    const value = hash.digest("hex").substring(0, 60);
    
    try {
        
        const txt = await resolveTxt(value + "." + domain);
        
        if(!txt[0] || !txt[0][0]) {
            return false;
        }
        
        return txt[0][0] === "tm-custom-domain-verification";
    } catch(e) {
        console.log(`Could not verify custom domain owner for ${domain}`);
        return false;
    }
}
