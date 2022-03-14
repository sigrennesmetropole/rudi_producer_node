# Ce fichier regroupe les éléments de discussion

## Exemple d'usage

 * Example:
 * $ logger -s -p local4.notice --msgid "RM$(uuidgen | cut -b 1-8).7987" -i --id="$$" --rfc5424=notq -t "rudiprod.rudimedia" --sd-id origin --sd-param 'ip="192.168.0.1"'  --sd-param 'subject="me"'  "Try Again $(date +'%s')"
 * <165>1 2021-10-22T16:11:23.617665+02:00 paraugroin rudiprod.rudimedia 2622506 RM5d2cebca.7987 [origin ip="192.168.0.1" subject="me"] Try Again 1634911883

## Commentaires

classe JS commune
    const    
        facility
        domain / id module (ex: rudiprod.api)
        origin: ip

    var
        date
        process
    fonction renvoie un msgId (hash alphanumérique assez court)

params des fonctions sysCalls
    severity
    msg
    msgId (nullable, sera utilisé pour calculer un id unique)
    meta (nullable)
        req_ip: string[]
        subject: string (module qui initie la req, identifié dans JWT et lié à une clé privée)
        client_id: string (uuid v4) (usr) (facultatif, identifié dans le JWT)
    context: raw, application specific


Notes :
    enterpriseId de Rennes Métropole: 1.3.6.1.4.1.51647


## Discussion sur les Formats (14/10/2021 à 14:22)
Bonjour,

Avec Laurent nous avons discuté des conventions qu'il serait bon de suivre pour homogénéiser un tant soit peu les logs produits par les différents modules du Nœud Producteur RUDI.
Voici nos propositions :

1. Envoyer les syslogs vers la "facility" (catégorie) local4
2. Indiquer la provenance des logs
rudiprod.
    api       
    media
    manager
    console
    robot
        .sous-module

3. Indiquer l'id du processus (procid / $$)
4. Numéroter l'erreur avec un numéro unique (md5 random par exemple)
5. Indiquer la classe/le type de l'erreur
6. Si vous avez un fichier avec une enum répertoriant les messages dans une langue, indiquer le code de l'enum (on fera un fichier par langue)
7. On utilisera les niveaux de gravité syslog pour dissocier les erreurs purement fonctionnelles des erreurs système : 0, 1, 2, 5 et 7 seront réservés aux messages système, 3, 4 et 6 pour la partie fonctionnelle de l'application.
Les messages de niveau debug ne doivent en principe pas être envoyés en environnement de production.

| Code | Gravité       | Type d'erreur | Mot-clé        | Description                                                              |
| ---- | ------------- | ------------- | -------------- | ------------------------------------------------------------------------ |
| 0    | Emergency     | sys           | emerg (panic)  | Système inutilisable (impossibilité de lancer le serveur par exemple).   |
| 1    | Alert         | sys           | alert          | Une intervention immédiate est nécessaire (ex: chemin inaccessible).     |
| 2    | Critical      | sys           | crit           | Erreur critique pour le système.                                         |
| 3    | Error         | app           | err (error)    | Erreur de fonctionnement.                                                |
| 4    | Warning       | app           | warn (warning) | Avertissement (une erreur peut intervenir si aucune action n'est prise). |
| 5    | Notice        | sys           | notice         | Événement normal méritant d'être signalé.                                |
| 6    | Informational | app           | info           | Pour information.                                                        |
| 7    | Debugging     | sys           | debug          | Message de mise au point, pour identifier une erreur dans le code.       |

Voici nos propositions, n'hésitez pas à réagir :)
