#!/bin/sh


for Fs in $(find . -iname '*-*-*' -exec echo '{}' \; | tr ' ' '~') ; do
    export F=$(echo $Fs | tr '~' ' ')
    export CRC=$(md5sum "$F"|cut -b1-32)
    export FT=$(file -i "$F")
    export ST=$(stat -c '%Y;%s' "$F")
    export file=$(echo "$FT" | sed 's/^[^_]*_//' )
    export id=$(echo "$FT" | sed 's/^\([^_]*\)_.*/\1/')
    export echo "$CRC;$id;$file;$ST";
done
