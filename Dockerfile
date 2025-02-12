FROM node:22 as js-build
WORKDIR /gotty
COPY js /gotty/js
COPY Makefile version.go /gotty/
RUN make bindata/static/js/gotty.js.map

FROM golang:1.23 as go-build
WORKDIR /gotty
COPY . /gotty
COPY --from=js-build /gotty/js/node_modules /gotty/js/node_modules
COPY --from=js-build /gotty/bindata/static/js /gotty/bindata/static/js
RUN CGO_ENABLED=0 make

FROM docker:cli
RUN apk update && \
    apk upgrade && \
    apk --no-cache add ca-certificates bash curl
COPY --from=go-build /gotty/gotty /usr/bin/
ENTRYPOINT ["gotty"]
