*v2.3.3 (2022.12.09)*

This version is the final version released for the RUDI Project (rudi.bzh).
New versions of the RUDI Producer will be released publicly financed by upcomming projects.

Note that RUDI_NODE stands as PROD_API/PROD-MANAGER/CONSOLE all combined. 

Main List of contributions :
* RUDI-NODE - Feature - compatibility with version the 1.3.0 of RUDI API
* RUDI-NODE - Feature - enable restricted access to data and metadata through data encryption and filtering
* RUDI-NODE - Feature - secured file transfer from UI to Media module
* CONSOLE - Feature - capacity to declare in a metadata a media that is hosted outside the RUDI node
* MANAGER - Feature - password management and user activation
* MEDIA - Feature - support of advanced user access rights using extended POSIX ACL and JWT tokens
* RUDI-NODE - Fix - Large file uploads
* CONSOLE - Fix - the UI displays the file transfer status

*v2.0.0 (2022.03.14)*

This version is the first version publicly released and ready to be
open as an open-source project.

Main List of contributions :
* PROD_API - Feature - database holding all elements of a Rudi-Producer metadata system (version 1.2)
* PROD_API - Feature - full implementation of the standard Rudi-Producer API 1.2.0
* PROD_API - Feature - publication and update of meta-data to the main RUDI portal (https://rudi.datarennes.fr/deploiement)
* MEDIA - Feature - generic driver for the storage of media data for the Rudi-Producer API
* MEDIA - Feature - access API extension, for direct and indirect access to Rudi-media referenced by Rudi Meta-data
* MANAGER - Feature - Complete Web-based front-end for the management of Rudi-Producer metadata
* MANAGER - Feature - Basic registration and authentication system

*v1.0 (2021.09.10)*

This version is a the first publicly used version, and was made as
a demonstrator of the technology.
