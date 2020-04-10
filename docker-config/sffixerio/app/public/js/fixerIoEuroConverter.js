/* fixerIoEuroConverter 
*
*  Classe Javascript qui consomme le service fixer.io
*  pour convertir des euros dans la devise choisie
*
*  @author : Benoît DEUFFIC <benoit+oclock@deuffic.fr>
*
*  pour le débogage et la formation on utilise toujours console.log() à chaque étape importante du programme
*/


/* fixerIoEuroConverter 
* Constructeur 
* Pas de paramètres en entrée
* fixe les variables de base nécessaires à la consommation du service 
*/

function fixerIoEuroConverter () {

   /* paramètre url de base du service */
   this.baseUrl = 'http://data.fixer.io/api/';

   /* clé d'api fournie à l'inscription au service */
   this.apiKey = '412e09694588a610eee73b014122cb69';

   /* points d'entrée pour consommer les fonctions */
   this.listCurEndpoint = 'symbols';
   this.convertEndpoint = 'convert';
   this.lastestEndpoint = 'latest';

   /* message générique si le service est indisponible quelque'en soit la raison */
   this.unavailableMessage = 'This service is unavailable. Please try later.';

}

/* fixerIoEuroConverter.init
*  méthode pour initialiser la page avec la liste des devises
*  tel que spécifié ici : https://fixer.io/documentation#supportedsymbols  
*
*  en entrée: (string) identifiant du composant select qui doit recevoir les options
*  en sortie: si réponse ok : remplie les options de la liste avec les identifiants et noms des devises retournées par le service
*             si réponse ko : remplie l'élément dédié à l'affichage des erreurs retournées par le services
*/

fixerIoEuroConverter.prototype.init = function ( listId )
{
        var serviceLocation = this.baseUrl + this.listCurEndpoint;

                                              /* ici on a aussi la possibilité de construire les paramètres d'URL avec $.params(), très utile lorsqu'y il y a beaucoup
                                              * de paramètres à gérer
                                              * http://api.jquery.com/jquery.param/ 
                                              */
        var urlWithParams = serviceLocation + '?access_key=' +  this.apiKey;

        console.log('Querying: ' + urlWithParams + '...');
      
        $.ajax({
            url: urlWithParams, 
            type: 'GET',
            crossDomain: true,  
            jsonp: false,
            dataType: 'json',
            success: function (data) {
               console.log(data);
               /* testons si le service a répondu 'success=true' tel que spécifié dans la doc du service 
               *  là c'est ok, on fait le traitement
               */
               if ( data.success === true ) {
 
                  /* le service a répondu, récupérons nos résultats tel que spécifié dans la doc du service. */
                  var results = data.symbols;

                  /* ici on parcourt la collection d'obbets retournés par le service en récupérant le couple clé-valeur des devises
                  *  et on remplie nos options sous la forme de texte html ( plus performant que de manipuler DOM )
                  */

                  for (let [key, value] of Object.entries(results)) {
                       $( listId ).append("<option value='" + key + "'>" + value + "</option>\n");
                     }
               }

               /* si non, on affiche le message d'erreur qui est retourné par le service */
               else {

                    displayError ( data.error.info );                  

                }
            },

            /* dans le cas de fixer.io, le service retourne toujours un code http 200, l'erreur étant indiquée dans le contenu de la réponse
            *  par contre c'est utile si jamais le service est indisponible ( code http différent de 200) et on affiche une erreur générique
            *  "service indisponible" quelqu'en soit la raison
            */  
            error: function (data) {
               console.log( data );

                    displayError ( this.unavailableMessage );                  

            }

          });
};

/* fixerIoEuroConverter.convert
*  méthode de conversion de la somme saisie en euros dans la devise choisie 
*  tel que spécifié ici : https://fixer.io/documentation#convertcurrency 
*  !! Ne fonctionne que si on a souscrit une license payante !!
*  --> sinon on va utiliser une autre méthode basée sur les derniers taux connus
*
*  en entrée: (string) amount : la somme saisie dans le champ texte
*             (string) currency :  l'identifiant de 3 lettres de la devise choisie dans la liste déroulante
*
*  en sortie: si amount est vide ou nul, ne fait rien
*             si ok, affiche le résultat de la conversion
*             si ko, affiche le message d'erreur du service et retourne faux
*/

fixerIoEuroConverter.prototype.convert = function ( amount, currency )
{
        /* ne faisons rien si la valeur amount est nulle ou vide */
        if ( !amount || 0 === amount.length ) { return ; }   

        /* réinitialisons le champs d'erreur */
        $( "#error" ).hide();

        var serviceLocation = this.baseUrl + this.convertEndpoint;

                                              /* ici on a aussi la possibilité de construire les paramètres d'URL avec $.params(), très utile lorsqu'y il y a beaucoup
                                              * de paramètres à gérer
                                              * http://api.jquery.com/jquery.param/ 
                                              */
        var urlWithParams = serviceLocation + '?access_key=' +  this.apiKey 
                                            + '&from=EUR'
                                            + '&to=' + currency
                                            + '&amount=' + amount;

        console.log('Querying: ' + urlWithParams + '...');

        /* petit trick pour pouvoir exploiter l'objet à l'intérieur d'une fonction anonyme (limitation js), on duplique l'objet dans une variable locale à la fonction courante :-) */
        var that = this;

        $.ajax({
            url: urlWithParams, 
            type: 'GET',
            crossDomain: true, 
            jsonp: false,
            dataType: 'json',
            success: function (data, object = this) {
               console.log(data);

               /* testons si le service a répondu 'success=true' tel que spécifié dans la doc du service 
               *  là c'est ok, on fait le traitement
               */

               if ( true === data.success ) {
                   /* on récupère notre montant converti dans la devise choisie */
                   var conversionAmount = data.result;
                   /* on récupère la devise choisie dans la requête*/
                   var choosedCurrency = data.query.to;

                   displayResult ( conversionAmount + '.' + choosedCurrency );

               }

              /* si non, on affiche le message d'erreur qui est retourné par le service */   
               else {

                    /* dans le cas où on n'a pas le droit d'utiliser la conversion en temps réel ( code: 105), on utilise la fonction de 
                    *  secours convertCallback
                    *
                    */
                    
                    if ( data.error.code === 105 ) {
                          displayError ( data.error.info + ' Trying with lastest currency rate...' );
                                                  
                          that.convertCallback ( amount, currency );

                          /* on sort */
                          return ;
                    }

                    displayError ( data.error.info );                  

               }
            },
            /* dans le cas de fixer.io, le service retourne toujours un code http 200, l'erreur étant indiquée dans le contenu de la réponse
            *  par contre c'est utile si jamais le service est indisponible ( code http différent de 200) et on affiche une erreur générique
            *  "service indisponible" quelqu'en soit la raison
            */  
            error: function (data) {
               console.log( data );

                    displayError ( this.unavailableMessage );

           }
          });
};

/* fixerIoEuroConverter.convertCallback
*  méthode de secours de conversion de la somme saisie en euros dans la devise choisie lorsqu'on a pas le droit d'accéder à la conversion en temps réel (payant)
*  tel que spécifié ici : https://fixer.io/documentation#latestrates 
*  récupère le dernier taux connu dans la devise sélectionné et applique le calcul avant de retourner le résultat
*
*  en entrée: (string) amount : la somme saisie dans le champ texte
*             (string) currency :  l'identifiant de 3 lettres de la devise choisie dans la liste déroulante
*
*  en sortie: si ok, affiche le résultat de la conversion
*             si ko, affiche le message d'erreur du service et retourne faux
*             si amount est vide ne fait rien
*/

fixerIoEuroConverter.prototype.convertCallback = function ( amount, currency )
{
        /* faisons rien si la méthode est appelée depuis un point externe à la classe et que amount est vide */
        if ( !amount || 0 === amount.length ) { return ; }
   
        /* réinitialisons le champs d'erreur */
        $( "#error" ).hide();

        var serviceLocation = this.baseUrl + this.lastestEndpoint;
                                              /* ici on a aussi la possibilité de construire les paramètres d'URL avec $.params(), très utile lorsqu'y il y a beaucoup
                                              * de paramètres à gérer
                                              * http://api.jquery.com/jquery.param/ 
                                              */
        var urlWithParams = serviceLocation + '?access_key=' +  this.apiKey 
                                            + '&base=EUR'
                                            + '&currencies=' + currency + ',';

        console.log('Querying: ' + urlWithParams + '...');

        $.ajax({
            url: urlWithParams, 
            type: 'GET',
            crossDomain: true, 
            jsonp: false,
            dataType: 'json',
            success: function (data) {
               console.log(data);

               /* testons si le service a répondu 'success=true' tel que spécifié dans la doc du service 
               *  là c'est ok, on fait le traitement
               */

               if (true === data.success ) {

                   /* On récupère notre taux de conversion dans la devise choisie en parcourant au préalable la collection d'objets reçue et trouver le taux de conversion
                   * correspondant à la devise choisie
                   */
                   var results = data.rates;
                   for (let [key, value] of Object.entries(results)) {
                     if (key === currency) {
                        var rateValue = value;
                     }
                   }

                  /* A t'on bien trouvé le taux associé à la devise saisie ? si non, affiche une erreur et on sort. */
                  if ( !rateValue || 0 === rateValue.length) { displayError ( 'Selected currency rate was not found, can not apply conversion.'); return; }

                  /* on applique le taux au montant saisi */
                   var conversionAmount = rateValue * amount ;

                  /* affichons le résultat */
                   displayResult ( conversionAmount + ' ' + currency );

               }

              /* si non, on affiche le message d'erreur qui est retourné par le service */   
               else {
                    
                   displayError ( data.error.info ) ;                  

               }
            },

            /* dans le cas de fixer.io, le service retourne toujours un code http 200, l'erreur étant indiquée dans le contenu de la réponse
            *  par contre c'est utile si jamais le service est indisponible ( code http différent de 200) et on affiche une erreur générique
            *  "service indisponible" quelqu'en soit la raison
            */  
            error: function (data) {
               console.log( data );
               displayError ( this.unavailableMessage );
           }
          });
};

/* displayError
*  fonction générique qui gère l'affichage des messages d'erreur retournés par le service
*  évite la répétition du même code un peu partout dans le programme.
*  en entrée : (string) message d'erreur
*  en sortie : remplie l'élément erreur
*/

function displayError ( message ) {

  $( "#error" ).empty();
  $( "#error" ).append( message );
  $( "#error" ).show();

};

/* displayResult
*  fonction générique qui gère l'affichage du résultat retourné par le service
*  évite la répétition du même code un peu partout dans le programme.
*  en entrée : (string) valeur du résultat
*  en sortie : remplie l'élément du résultat
*/

function displayResult ( value ) {

  $( "#result" ).empty();
  $( "#result" ).append( value );


}

/* hideFields
*  fonction générique qui cache nos champs de résultats
*/

function hideFields() {

  $( "#result" ).empty();
  $( "#error" ).hide();

}
